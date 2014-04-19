#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <math.h>
#include <stdint.h>
#include <time.h>
#include <poll.h>

#define PACK(buf, n) buf[0]=(n >> 24)&0xFF; \
	buf[1]=(n >> 16)&0xFF; \
	buf[2]=(n >> 8)&0xFF; \
	buf[3]=(n >> 0)&0xFF;

int readstdin ()
{
    struct pollfd fds;
    int ret;
    fds.fd = 0; /* this is STDIN */
    fds.events = POLLIN;
    ret = poll(&fds, 1, 100);
    return ret;
}
	
FILE *fp;

int main ()
{
	setbuf(stdout, NULL);

	uint32_t samplecount = 0;
	int lastsample = -1;
	int sample = 0;
  

	fp = fopen("log.bin", "a+");

	do {
		if ((sample = fgetc(stdin)) == -1) {
			return 0;
		}
		if (sample != lastsample) {
			uint8_t buf[5] = {0};
			PACK(buf, samplecount);
			buf[4] = sample;
			// fwrite(buf, 5, 1, fp);
		}
		lastsample = sample;
		samplecount++;
	} while(readstdin());

	fclose(fp);     

	kill(1);
	return 1;
}