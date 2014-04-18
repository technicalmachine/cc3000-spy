#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <math.h>
#include <stdint.h>

void readinput (char** line, size_t* size)
{
	int ret = getline(line, size, stdin);
	if (ret == -1) {
		exit(0);
	}
}

#define sample_t uint16_t
#define SAMPLE_BITS (sizeof(sample_t)*8)

#define GETBIT(ARR, C) (((ARR)[(uint8_t) (C / 8)] >> (C % 8)) & 1)

int main ()
{
	setbuf(stdout, NULL);

	char *line = NULL;
	size_t size;
	int res;

	readinput(&line, &size); //libsigrok line

	// Acquisition line
	readinput(&line, &size);
	int nprobes;
	int maxprobes;
	long freqstr;
	char freqtype[20] = {0};
	res = sscanf(line, "Acquisition with %d/%d probes at %ld %s", &nprobes, &maxprobes, &freqstr, freqtype);
	if (res == -1) {
		return 1;
	}
	// convert freqtype to freq multiplier
	uint32_t freq = freqstr;
	if (freqtype[0] == 'k') freq *= 1e3;
	if (freqtype[0] == 'm') freq *= 1e6;

	// Create 8xprobes grid
	uint8_t* grid = calloc(1, 8 * nprobes);
	// printf("probes %d at %u hz\n", nprobes, freq);

	sample_t lastsample = 0;
	uint32_t samplecount = 0;

	// LOOP
	printf("%04x%08x", nprobes, freq);
	while (1) {
		for (int i = 0; i < nprobes; i++) {
			readinput(&line, &size);
			unsigned p, b[8];
			
			if (sscanf(line, "%d:%x %x %x %x %x %x %x %x", &p, &b[0], &b[1], &b[2], &b[3], &b[4], &b[5], &b[6], &b[7]) <= 0) {
				return 1;
			}
			for (int j = 0; j < 8; j++) {
				grid[p*8 + j] = (uint8_t) b[j];
			}
		}

		// Grid now points to a single sample. (8x8 readings of probe 1, then probe 2...)
		// for (int j = 0; j < nprobes; j++) {
		// 	printf("%d: %x %x %x %x %x %x %x %x\n", j+1, grid[(j*8)+0], grid[(j*8)+1], grid[(j*8)+2], grid[(j*8)+3], grid[(j*8)+4], grid[(j*8)+5], grid[(j*8)+6], grid[(j*8)+7]);
		// }

		for (int j = 0; j < 8*8; j++) {
			samplecount++;

			sample_t b = 0;
			for (int k = 0; k < (nprobes < SAMPLE_BITS ? nprobes : SAMPLE_BITS); k++) {
				b = (b << 1) + GETBIT(&grid[k*8], j);
			}

			// printf("%d\t", samplecount);
			// for (int l = 0; l < SAMPLE_BITS; l++) {
			// 	printf("%d", (b >> (SAMPLE_BITS-1-l)) & 1);
			// }
			if (b != lastsample) {
				// printf("\tchanged at %ld", samplecount);
				printf("%08x%04x", samplecount, b);
			}
			// printf("\n");
			lastsample = b;

			// b is sample at this time
		}


		// readinput(&line, &size);
		// printf("%x%x%x%x%x%x%x%x", line);
	}
	return 0;
}