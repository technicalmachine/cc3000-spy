**[UNMAINTAINED] This library does not have a maintainer. The source code and repository will be kept at this URL indefinitely. If you'd like to help maintain this codebase, create an issue on this repo explaining why you'd like to become a maintainer and tag @tessel/maintainers in the body.**

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
