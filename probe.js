var spawn = require('child_process').spawn;
require('colors');

var opts = require('nomnom')
	.options({
		samplerate: {
			default: '8M'
		}
	})
	.parse();

var sig = spawn('sigrok-cli', [
	'--driver', 'fx2lafw',
	'--continuous',
	'--config', 'samplerate=' + opts.samplerate,
	'--output-format', 'vcd',
	'--output-file', '/tmp/sigrok.vcd',
	'--probes', '0=cs,1=miso,2=irq,3=mosi,4=sck,5=sw_en'
])
sig.stderr.pipe(process.stderr);
sig.stdout.pipe(process.stdout);
sig.on('exit', function (code) {
	// process.exit(code);
	console.log(('(sigrok exited with code ' + code + ')').grey)
});