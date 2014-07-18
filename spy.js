#!/usr/bin/env node

// require('look').start();

var fs = require('fs');
var util = require('util');
var zlib = require('zlib');

var vcd = require('vcd');
require('colors');

require('colorsafeconsole')(console)

var opts = require('nomnom')
  .options({
    signals: {
      abbr: 's',
      flag: true,
      help: 'Show signals'
    },
    raw: {
      abbr: 'r',
      flag: true,
      help: 'Show raw communication'
    },
    input: {
      position: 0,
      help: 'Log options',
    },
    output: {
      abbr: 'o',
      help: 'Save log as output',
      default: (new Date).toJSON() + '.log'
    }
  })
  .parse();

require('buffer').INSPECT_MAX_BYTES = 16;

var LARR = '\u2190';
var RARR = '\u2192';


function formatFdset (n) {
  return ('0000' + n.toString(2)).slice(-4).split('').reverse().map(function (s, i) {
    return s == '0' ? '.'.grey : String(i)
  }).join('');
}

var cmnd_format = {
  SOCKET: function (data) {
    return util.format('-> request to open socket...');
  },
  CLOSE_SOCKET: function (data) {
    return util.format('-> request to close socket #%d...', data.readInt32LE(0));
  },
  CONNECT: function (data) {
    return util.format('-> connecting socket #%d... (%d.%d.%d.%d)', data.readInt32LE(0), /*data.readInt32LE(8),*/ data.readUInt8(19), data.readUInt8(18), data.readUInt8(17), data.readUInt8(16))
  },
  SELECT: function (data) {
    return util.format(RARR + ' r %s w %s e %s [%s, timeout: %dms]',
        // data.readInt32LE(0),
        formatFdset(data.readInt32LE(24)),
        formatFdset(data.readInt32LE(28)),
        formatFdset(data.readInt32LE(32)),
        data.readInt32LE(20) ? 'blocking' : 'non-blocking',
        data.readInt32LE(36)*1e3 + data.readInt32LE(40)/1e3);
  },
};
var evnt_format = {
  SOCKET: function (data) {
    return util.format('<- socket #%d opened.', data.readInt32LE(0));
  },
  CLOSE_SOCKET: function (data) {
    return util.format('<- socket closed. (errno %d)', data.readInt32LE(0));
  },
  SELECT: function (data) {
    return util.format(LARR + ' r %s w %s e %s [status %d]',
        formatFdset(data.readInt32LE(4)),
        formatFdset(data.readInt32LE(8)),
        formatFdset(data.readInt32LE(12)),
        data.readInt32LE(0));
  },
}


var D = require('./defines');
var HCI_EVENT = {}
for (var k in D) { if (1) HCI_EVENT[D[k]] = k; };

// http://processors.wiki.ti.com/index.php/CC3000_Protocol#WRITE_protocol_in_MOSI_direction

function parseHost (dir, buf, miso)
{
  function abort (str) {
    return util.format.apply(util, ['%s %s ' + str].concat([(dir + ' err').red, '-'.grey], [].slice.apply(arguments).slice(1), '\n\tCC3K:'.red, miso, '\n\tHOST:'.red, buf));
  }

  if (buf.length < 5) { return abort('buf len < 5'); }
  if (buf[0] == 1) {
    var opcode = (RARR + ' write').cyan;
    var length = buf.readUInt16BE(1);
    var packetlen = Math.max(5, length) // minimum 5 bytes in payload.
    var payload = buf.slice(5);
    // if (payload.length >> 1 != packetlen >> 1) {
    //  return abort('expecting %d bytes in write payload, received %d', length, payload.length);
    // }
  } else if (buf[0] == 3) {
    var opcode = (LARR + ' read ').yellow;
    var length = miso.readUInt16BE(3)
    var payload = miso.slice(5);
    // if (payload.length >> 1 != length >> 1) {
    //  return abort('expecting %d bytes in read payload, received %d', length, payload.length);
    // }
  } else {
    return util.format('%s - buf cmd -', 'invalid!'.red, buf);
  }

  function nget (arg) {
    // console.log(HCI_EVENT[arg]);
    return (HCI_EVENT[arg] || '').replace(/^HCI_[A-Z]+_/, '');
  }

  function n (arg) {
    return (nget(arg) + '                ').slice(0, 20);
  }

  function formatCommand (n) {
    return cmnd_format[n] && function () {
      try {
        return cmnd_format[n].apply(null, arguments);
      } catch (e) {
        return String(e.message).red
      }
    }
  }

  function formatEvent (n) {
   return evnt_format[n] && function () {
      try {
        return evnt_format[n].apply(null, arguments);
      } catch (e) {
        return String(e.message).red
      }
    }
  }

  // parse payload
  try {
    if (payload[0] == 1) {
      // if (payload.length != 5) { return util.format('invalid hci command len -', buf).red }
      var cmdop = payload.readUInt16LE(1);
      if (!HCI_EVENT[cmdop]) { return abort('unknown hci command', cmdop.toString(16), payload).red; }
      var arglen = payload[3];
      var result = (formatCommand(nget(cmdop)) || function (buf) { return util.format('%d bytes:', buf.length, buf).grey; })
      payload = util.format('%s%s %s', 'HCI_CMND_'.cyan, n(cmdop).cyan.bold, result(payload.slice(4, 4+arglen)));
    } else if (payload[0] == 2) {
      var dataop = payload[1];
      var arglen = payload[2];
      var payloadlen = payload.readUInt16BE(1);
      payload = util.format((buf[0] == 1 ? '         DATA'.bold.cyan : '         DATA'.bold.yellow) + n(''), util.format(payload.slice(5).length, 'bytes:', payload.slice(5)).grey);
    } else if (payload[0] == 3) {
      var patchop = payload.readUInt16BE(1);
      var patchlen = payload.readUInt16BE(3);
      var hcipayload = payload.readUInt16BE(5);
      payload = util.format('PTCH'.green, patchop.toString(16), patchlen, hcipayload);
    } else if (payload[0] == 4) {
      var eventop = payload.readUInt16LE(1);
      if (!HCI_EVENT[eventop]) { return abort('unknown hci event 0x' + eventop.toString(16)); }
      var arglen = payload.readUInt16LE(3);
      // var hcistatus = payload[4];
      var result = (formatEvent(nget(eventop)) || function (buf) { return util.format('%d bytes:', buf.length, buf).grey; })
      payload = util.format('%s%s %s', 'HCI_EVNT_'.yellow, n(eventop).yellow.bold, result(payload.slice(5, 4+arglen)));
    } else {
      return abort('cannot evaluate payload cmd', payload[0]);
    }
  } catch (e) {
    return abort(e.message);
  }

  return util.format('%s %s', opcode, payload);
}

var iterator = (function () {
  // data is a stream of data
  var miso = new Buffer(16*1024); var misob = 0, misobi = 0;
  var mosi = new Buffer(16*1024); var mosib = 0, mosibi = 0;
  var dir = null;

  return function next (sample, change, data) {
    if (change.sw_en) {
      console.log(('\n\ncc3000 enabled at ' + sample).toUpperCase().white.bold)
    }
    if (change.cs == 0) {
      misob = 0, misobi = 0;
      mosib = 0, mosibi = 0;
    }
    if (change.cs == 1) {
      var mosiview = mosi.slice(0, (mosibi/8)|0);
      var misoview = miso.slice(0, (misobi/8)|0);

      // end of switch
      if (opts.raw) {
        console.log('MOSI', mosiview);
        console.log('MISO', misoview);
      }
      // else {
        if (dir == 'host') {
          console.log('', parseHost(dir, mosiview, misoview));
        } else {
          console.log('', parseHost(dir, mosiview, misoview));
        }
      // }
    }
    if (change.irq !== null) {
      if (change.irq) {
        if (opts.signals) if (!data.cs) console.log('↑ IRQ'.grey); else console.log('↑ CS '.grey);
        if (dir == 'cc3k') {
          dir = null;
          // console.log('cc3k end.\n'.green);
        }
      } else {
        if (opts.signals) if (data.cs) console.log('↓ IRQ'.yellow); else console.log('↓ CS '.cyan);
        if (dir == null) {
          dir = 'cc3k';
          // console.log('CC3K REQUEST'.green);
        }
      }
    }
    if (change.cs !== null) {
      if (change.cs) {
        if (dir == 'host') {
          dir = null;
          // console.log('host end.\n'.yellow);
        }
      } else {
        if (dir == null) {
          dir = 'host';
          // console.log('HOST REQUEST'.yellow);
        }
      }
    }
    if (change.sck == false) {
      if (data.sw_en) {
        misob = (misob << 1) + (data.miso ? 1 : 0); misobi++;
        mosib = (mosib << 1) + (data.mosi ? 1 : 0); mosibi++;
        // console.log('mosi:', data.mosi, 'miso:', data.miso);
        // console.log(miso.length);
        if ((misobi % 8) == 0) {
          // console.log('miso:', parseInt(miso.join(''), 2).toString(16));
          miso[((misobi / 8)|0) - 1] = misob;
          misob = 0;
        }
        if ((mosibi % 8) == 0) {
          mosi[((mosibi / 8)|0) - 1] = mosib;
          mosib = 0;
        }
      }
    }
  }
})();


if (!opts.input) {
  // Start probing.
  require('./probe').probe(function (prober) {
    var log = require('child_process').spawn('tail', ['-n', '10000000000', '-F', '/tmp/sigrok.vcd']);

    var once = false;
    process.on('SIGINT', function () {
      // Only kill prober.
      if (once) {
        return process.exit(1);
      }
      once = true;
      console.error('(killed sigrok, wait to finish...)'.grey);
      log.kill();
      prober.on('exit', function () {
        fs.createReadStream('/tmp/sigrok.vcd')
          .pipe(zlib.createGzip())
          .pipe(fs.createWriteStream(filename))
      })
      prober.kill();
    })

    // Pipe to gzipped output.
    var filename = __dirname + '/log/' + opts.output;
    console.log(('(outputting to ' + filename + ')').grey);
    process.on('exit', function () {
      console.log(('(saved output to ' + filename + ')').grey);
    });

    // Start with tailed log.
    start(log.stdout);
  });

} else {
  // Load gzipped output
  start(fs.createReadStream(opts.input)
    .pipe(zlib.createGunzip()));
}

function start (log)
{
  log
  .pipe(vcd.createStream({
    combineSamples: false
  }))
  .on('begin', function (state) {
    // console.log(state);
  })
  .on('sample', iterator)
};