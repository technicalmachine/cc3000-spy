all: build

build:
	@gcc -o sigrok_compactor sigrok_compactor.c -O3 -std=gnu99 1>&2

poll: build
	@echo starting 1>&2
	@sigrok-cli --output-format binary --driver fx2lafw --continuous --config samplerate=4M | ./sigrok_compactor