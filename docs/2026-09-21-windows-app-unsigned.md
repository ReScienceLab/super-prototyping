# The Windows app ships unsigned

The macOS app is signed and notarised because the lab already has an Apple
Developer account, and because macOS calls an unsigned download damaged. Windows
is different on both counts, so the maintainer decided the Windows installer
ships unsigned, at no cost, until that stops being good enough (#111).

## What an unsigned installer costs the user

Windows does not require a signature. SmartScreen shows "Windows protected your
PC" the first time the installer runs, and **More info**, then **Run anyway**
gets past it. Open source has no exemption from that, and no free pass either.

## What signing would cost

- **SignPath Foundation** signs open source for free. The publisher shown is
  SignPath Foundation, and the project has to meet its conditions: an OSI
  licence, no proprietary parts, a release already out, and a written policy
  of roles and MFA.
- **Azure Artifact Signing** is $9.99 a month and shows the lab's own name. It
  needs a paid Azure subscription. electron-builder supports it through
  `win.azureSignOptions`, under its former name, Trusted Signing.

Either is a change to the `nsis` job in `.github/workflows/release.yml` and
nothing else. Revisit when someone reports the warning as the reason they did
not install.

## What was taken from other apps

Eleven open-source desktop apps were read for how they release. Ten of the ten
that ship for Windows build it on a Windows runner and none cross-build, so the
installer has its own `windows-latest` job. NSIS is the majority target, and its
default is a per-user install that needs no administrator. Two of the ten,
Bruno and Cherry Studio, ship unsigned.

## Left out

- **winget.** Wanted, as the Windows counterpart of the Homebrew cask, once a
  release with the installer exists and has been tried on a real machine.
- **An arm64 installer.** Windows on Arm runs the x64 one. Add it when someone
  asks.
- **A packaging build on every pull request.** The dmg has none either. The
  release job is the list of commands.
