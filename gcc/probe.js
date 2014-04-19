var spawn = require('child_process').spawn;


var sig = spawn('sigrok-cli', ['--output-format', 'binary', '--driver', 'fx2lafw', '--continuous', '--config', 'samplerate=1M'])
sig.on('exit', function (code) {
	console.error('closed with', code);
	// console.error('[keepalive]'.grey)
	// setImmediate(loop);
})

var compact = spawn('./sigrok_compactor', []);
compact.on('exit', function (code) {
	console.error('compactor closed', code);
	sig.stdin.write(new Buffer([0x00]));
	// sig.kill();
})
// compact.stderr.pipe()

compact.stdout.on('error', function () { })
compact.stdin.on('error', function () { })

sig.stdout.on('error', function () { })
sig.stdin.on('error', function () { })

sig.stderr.pipe(process.stderr)
sig.stdout.pipe(compact.stdin);
compact.stdout.on('data', function (buf) {
	callback(buf);
});
// compact.stdout.on('data', function (buf) {
// 	console.log(buf.length);
// });