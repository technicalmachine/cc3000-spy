#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <math.h>
#include <stdint.h>

#define PACK(buf, n) buf[0]=(n >> 24)&0xFF; \
	buf[1]=(n >> 16)&0xFF; \
	buf[2]=(n >> 8)&0xFF; \
	buf[3]=(n >> 0)&0xFF;

int main ()
{
	setbuf(stdout, NULL);

	uint32_t samplecount = 0;
	int lastsample = -1;
	int sample = 0;
	while((sample = fgetc(stdin)) >= 0) {
		if (sample != lastsample) {
			uint8_t buf[5] = {0};
			PACK(buf, samplecount);
			buf[4] = sample;
			fwrite(buf, 5, 1, stdout);
		}
		lastsample = sample;
		samplecount++;
	}
	return 0;
}