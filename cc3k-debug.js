#!/usr/bin/env node

var fs = require('fs');
var util = require('util');

var ts = require('tail-stream');
var vcd = require('vcd');
require('colors');

var opts = require('nomnom')
	.option('signals', {
      abbr: 's',
      flag: true,
      help: 'Show signals'
   })
	.option('raw', {
      abbr: 'r',
      flag: true,
      help: 'Show raw communication'
   })
   .parse();

console.error('inspect'.grey)

require('buffer').INSPECT_MAX_BYTES = 16;

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
		var opcode = '-> write'.cyan;
		var length = buf.readUInt16BE(1);
		var packetlen = Math.max(5, length) // minimum 5 bytes in payload.
		var payload = buf.slice(5);
		// if (payload.length >> 1 != packetlen >> 1) {
		// 	return abort('expecting %d bytes in write payload, received %d', length, payload.length);
		// }
	} else if (buf[0] == 3) {
		var opcode = '<- read '.yellow;
		var length = miso.readUInt16BE(3)
		var payload = miso.slice(5);
		// if (payload.length >> 1 != length >> 1) {
		// 	return abort('expecting %d bytes in read payload, received %d', length, payload.length);
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

	var cmnd_format = {
		SOCKET: function (data) {
			return util.format('-> request to open socket...');
		},
		CLOSE_SOCKET: function (data) {
			return util.format('-> request to close socket #%d...', data.readInt32LE(0));
		},
		CONNECT: function (data) {
			return util.format('-> connecting socket #%d... (%d.%d.%d.%d)', data.readInt32LE(0), /*data.readInt32LE(8),*/ data.readUInt8(19), data.readUInt8(18), data.readUInt8(17), data.readUInt8(16))
		}
	};
	var evnt_format = {
		SOCKET: function (data) {
			return util.format('<- socket #%d opened.', data.readInt32LE(0));
		},
		CLOSE_SOCKET: function (data) {
			return util.format('<- socket closed. (errno %d)', data.readInt32LE(0));
		}
	}

	// parse payload
	if (payload[0] == 1) {
		// if (payload.length != 5) { return util.format('invalid hci command len -', buf).red }
		var cmdop = payload.readUInt16LE(1);
		if (!HCI_EVENT[cmdop]) { return abort('unknown hci command', cmdop.toString(16), payload).red; }
		var arglen = payload[3];
		var result = (cmnd_format[nget(cmdop)] || function (buf) { return util.format('%d bytes:', buf.length, buf).grey; })
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
		var result = (evnt_format[nget(eventop)] || function (buf) { return util.format('%d bytes:', buf.length, buf).grey; })
		payload = util.format('%s%s %s', 'HCI_EVNT_'.yellow, n(eventop).yellow.bold, result(payload.slice(5, 4+arglen)));
	} else {
		return abort('cannot evaluate payload cmd', payload[0]);
	}

	return util.format('%s %s', opcode, payload);
}

var iterator = (function () {
	// data is a stream of data
	var misob = [], mosib = [], miso = [], mosi = [];
	var dir = null;

	return function next (sample, change, data) {
		if (change.sw_en) {
			console.log(('\n\ncc3000 enabled at ' + sample).toUpperCase().white.bold)
		}
		if (change.cs == 0) {
			miso = []; misob = [];
		 	mosi = []; mosib = [];
		}
		if (change.cs == 1) {
			// end of switch
			if (opts.raw) {
				console.log('MOSI', new Buffer(mosi));
				console.log('MISO', new Buffer(miso));
			}
			// else {
				if (dir == 'host') {
					console.log('', parseHost(dir, new Buffer(mosi), new Buffer(miso)));
				} else {
					console.log('', parseHost(dir, new Buffer(mosi), new Buffer(miso)));
				}
			// }
		}
		if ('irq' in change) {
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
		if ('cs' in change) {
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
				misob.push(data.miso); mosib.push(data.mosi);
				// console.log('mosi:', data.mosi, 'miso:', data.miso);
				// console.log(miso.length);
				if (misob.length == 8) {
					// console.log('miso:', parseInt(miso.join(''), 2).toString(16));
					miso.push(parseInt(misob.join(''), 2))
					misob = [];
				}
				if (mosib.length == 8) {
					mosi.push(parseInt(mosib.join(''), 2))
					mosib = [];
				}
			}
		}
	}
})();


var fs = require('fs');

var buf = new Buffer(0);
var data = [];
var last = {};

ts.createReadStream(__dirname + '/test.bin', {
    beginAt: 0,
    onMove: 'follow',
    detectTruncate: true,
    onTruncate: 'end',
    endOnError: false
})
	.pipe(vcd.createStream({
		combineSamples: false
	}))
	.on('begin', function (state) {
		console.log(state);
	})
	.on('sample', iterator);