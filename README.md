# cc3000-spy

```
npm install -g git+https://github.com/tessel/cc3000-spy
```

on OSX, install sigrok-cli <http://sigrok.org/wiki/Mac_OS_X>

then

```
cc3000-spy
```

with the dongle attached.


## Attaching the dongle

From <https://tessel.io/docs/hardware#advanced-features>:

```
Six-pin, 0.05" pitch debug header for the CC3000.

Pinout (pin 1 is closest to Module Ports C and D, pin 6 is nearest the LPC):

1. CS
2. MISO
3. IRQ
4. MOSI
5. SCK
6. Enable
```

Connect logic analyzer GND somewhere convenient, such as the header pin next to the Port C label.


## Bunch of Python warnings while installing sigrok-cli?


E.g. the first sign of trouble is:

```
Your PYTHONPATH points to a site-packages dir for Python 2.x but you are running Python 3.x!
     PYTHONPATH is currently: "/usr/local/lib/python:/usr/local/lib/python2.7/site-packages:"
     You should `unset PYTHONPATH` to fix this.
Warning: The post-install step did not complete successfully
You can try again using `brew postinstall python3`
```

Do this:

```
unset PYTHONPATH
brew postinstall python3
brew install sigrok-cli
```

…and that should fix it. Probably need to `unset PYTHONPATH` whenver you try run it.

## missing `fx2lafw-saleae-logic.fw`?

if you get an error for this, try the following commands to acquire the file:

```
brew install rpm2cpio
wget ftp://ftp.pbone.net/mirror/ftp5.gwdg.de/pub/opensuse/repositories/home:/Heinervdm:/sigrok/openSUSE_Tumbleweed/noarch/sigrok-firmware-fx2lafw-0.1.1-4.1.noarch.rpm
rpm2cpio.pl sigrok-firmware-fx2lafw-0.1.1-4.1.noarch.rpm | cpio -idmv
cp ./usr/share/sigrok-firmware/fx2lafw-saleae-logic.fw .
rm -rf ./usr
mv fx2lafw-saleae-logic.fw <location it says to move to>
```
