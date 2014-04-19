var fs = require('fs');
var spawn = require('child_process').spawn;
require('colors');

var opts = require('nomnom')
  .options({
    samplerate: {
      default: '8M'
    }
  })
  .parse();

exports.probe = function (next) {
  try {
    fs.unlinkSync('/tmp/sigrok.vcd');
  } catch (e) { }
  
  var sig = spawn('sigrok-cli', [
    '--driver', 'fx2lafw',
    '--continuous',
    '--config', 'samplerate=' + opts.samplerate,
    '--output-format', 'vcd',
    '--output-file', '/tmp/sigrok.vcd',
    '--probes', '0=cs,1=miso,2=irq,3=mosi,4=sck,5=sw_en'
  ])
  sig.stderr.on('data', function (data) {
    if (data.match(/Device stopped/)) {
      sig.kill();
      console.error(data);
    }
  })
  sig.stdout.pipe(process.stdout);
  sig.on('exit', function (code) {
    // process.exit(code);
    console.log(('(sigrok exited with code ' + code + ')').grey)
  });
  console.log('(sigrok started)'.grey);

  setImmediate(function loop () {
    // Loop until file exists
    var log;
    try {
      var fd = fs.openSync('/tmp/sigrok.vcd', 'r');
    } catch (e) {
      return setImmediate(loop);
    }
    fs.closeSync(fd);
    next();
  });
};