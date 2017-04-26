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
    '--channels', '0=cs,1=miso,2=irq,3=mosi,4=sck,5=sw_en'
  ])
  sig.stderr.on('data', function (data) {
    if (String(data).indexOf('fx2lafw-saleae-logic.fw') > -1) {
      console.log('ERR'.red, 'Missing the Saleae logic driver.');
      console.log('');
      console.log('You can install this (for example on OS X) with this following (in a temp dir):');
      console.log('  brew install rpm2cpio');
      console.log('  wget ftp://ftp.pbone.net/mirror/ftp5.gwdg.de/pub/opensuse/repositories/home:/Heinervdm:/sigrok/openSUSE_Tumbleweed/noarch/sigrok-firmware-fx2lafw-0.1.1-4.1.noarch.rpm');
      console.log('  rpm2cpio.pl sigrok-firmware-fx2lafw-0.1.1-4.1.noarch.rpm | cpio -idmv')
      console.log('  cp ./usr/share/sigrok-firmware/fx2lafw-saleae-logic.fw .')
      console.log('  rm -rf ./usr');
      console.log('  mv fx2lafw-saleae-logic.fw ' + String(data).match(/\S+fx2lafw\-saleae\-logic\.fw/)[0]);
      console.log('Then re-running.');
      console.log('');
    }
    if (String(data).match(/Device stopped/)) {
      sig.kill();
      console.error(String(data).grey);
    }
    if (String(data).match(/No devices/)) {
      console.error(String(data).grey);
      process.exit(1);
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
    next(sig);
  });
};