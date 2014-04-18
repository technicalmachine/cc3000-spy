var fs = require('fs');

var buf = new Buffer(0);
var first = true;
fs.createReadStream('./out')
	.on('data', function (data) {
		buf = Buffer.concat([buf, data]);
		while (buf.length > 12) {
			if (first == true) {
				var nprobes = parseInt(buf.slice(0, 4).toString(), 16)
				var freq = parseInt(buf.slice(4, 12).toString(), 16)
				console.log('%d probes @ %d hz', nprobes, freq);
				first = false;
			} else {
				var samplen = parseInt(buf.slice(0, 8).toString(), 16);
				var sample = parseInt(buf.slice(8, 12).toString(), 16);
				console.log('sample', samplen, sample.toString(2))
			}
			buf = buf.slice(12);
		}
	})