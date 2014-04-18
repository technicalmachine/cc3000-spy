var fs = require('fs');

var buf = new Buffer(0);
// fs.createReadStream('./out')
process.stdin
	.on('data', function (data) {
		buf = Buffer.concat([buf, data]);
		while (buf.length >= 5) {
			var samplen = buf.readUInt32BE(0);
			var sample = buf[4];
			console.log('sample', samplen, sample.toString(2));
			buf = buf.slice(5);
		}
	});
process.stdin.resume()