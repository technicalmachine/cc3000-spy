var ts = require('tail-stream');
var vcd = require('vcd');

ts.createReadStream(__dirname + '/test.bin', {
    beginAt: 0,
    onMove: 'follow',
    detectTruncate: true,
    onTruncate: 'end',
    endOnError: false
})
	.pipe(vcd.createStream())
	.on('begin', function (state) {
		console.log(state);
	})
	.on('sample', function (n, changes, last) {
		console.log(n, changes);
	})