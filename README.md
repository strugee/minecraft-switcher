# minecraft-switcher

# About

minecraft-switcher is Minecraft server multi-world management for the lazy hobbyist. It lets you select the world you want to switch to in a web UI and then it will switch your existing server over to that world. It is designed for small groups of players and to be as dead-simple to deploy and run as possible.

Features:

* No database
* Only one Minecraft server process running at a time
* No need to mod the server
* Authenticates with FIDO2 security devices
* No usernames or passwords to remember; either you have an authorized security key or you don't
* Doesn't take control of your entire server (everything it does, you could do manually, so you can stop using it if you want and your data will be super easy to manage)
* Ugly web UI without anything nice like maps of worlds

If any of these "features" actually sound like defects to you, that's okay! You're probably not minecraft-switcher's target audience. But many of these are by design and won't change, so you should also probably look elsewhere for a server management solution.

# Deployment

You will need Node.js. Install it with `npm`:

    npm install -g strugee/minecraft-switcher

minecraft-switcher does not support HTTPS, but it _does_ require HTTPS. Therefore you are expected to terminate HTTPS with a reverse proxy like Apache or Nginx, and forward the request on to minecraft-switcher.

minecraft-switcher assumes that you are using Spigot and that you've installed the server in `/opt/spigot`. (I will add a config option to change this eventually, probably.) You need to create `/opt/spigot/world_repository`, which is where worlds will be stored. Then you need to move `world`, `world_nether`, and `world_the_end` into a subdirectory of the world repository. Finally, you will need to create a directory to store the database of registered security keys; the example production config file suggests `/var/lib/local/minecraft-switcher` for this purpose. It must be read-write for minecraft-switcher.

For example, these commands would do the trick:

```sh
systemctl stop spigot
mkdir -p
mkdir -p /opt/spigot/world_repository/original_world /var/lib/local/minecraft-switcher
mv /opt/spigot/world{,_nether,_the_end} /opt/spigot/server.properties /opt/spigot/world_repository/original_world/
ln -s /opt/spigot/world_repository/original_world/* /opt/spigot/
```

minecraft-switcher also assumes it can create, modify and delete files in `/opt/spigot` and `/opt/spigot/world_repository`. It is your responsibility to arrange for this.

Finally, minecraft-switcher must be able to issue `systemctl` and `journalctl` commands. If you really want you can look in the source to see what the exact commands are (so you can lock down your `sudoers` or whatever), but personally what I do is just run it as "root", except in an LXD container (the same container the Minecraft server is running in) so it isn't actually root on the host system. I have been extremely pleased with this setup so far.

You should also copy the `config.json.example-prod` file to `config.json` and modify the `secret` value. Just generate something random and stick it in there.

Once the web server is running, visit the web UI in your browser. You will be prompted to enroll an initial security key to bootstrap from. You'll be able to enroll more once you're logged in.

# Design

minecraft-switcher is designed for simple hobbyist server scenarios where you don't want to run more than one Minecraft server process and don't want to muck with advanced multiworld mods, but you want to be able to play multiple worlds on the server. It changes worlds by shutting down the server, updating some symlinks, and booting the server up again.

minecraft-switcher does not use accounts. Instead you enroll FIDO2/Webauthn security keys and any one of these keys will grant complete access to the system. This is much simpler and means that there is very little persistence to deal with server-side. No database, just a simple JSON file with authorized keys.

Consequently minecraft-switcher is designed for an environment where ALL of the following is true:

1. You don't care about differentiating between different users, only that they're either authenticated or they're not
2. You have a small number of people you want to give access to, and therefore a small number of keys you want to enroll
3. You use systemd and journald

Here are the reasons you will have a Very Bad Time(tm) if any of these aren't true (listed in the same order as the first list):

1. As mentioned above, there's no such thing as accounts in minecraft-switcher. You're either in or you're out. There's no underlying reason for this, it's just the way it's designed because that's what was best for my personal use case and it makes a lot of things simpler.
2. Two things: one, every time someone tries to log in we do an O(n) linear search of all the keys so if you have a huge amount of keys that's just really no good. Two, the keys are just serialized to JSON and shoved into a file on disk every time a new one is enrolled. So if you have lots and lots of keys, you're going to completely block the event loop for a while while all of them are serialized to JSON, and then it's going to write out literally all of the keys again which is going to pummel your disk. But the benefit of doing it this way is that there is no database whatsoever, unless you count a single file in your filesystem.
3. The commands to start and stop the Minecraft server assume systemd. I will eventually add config options to make it so you can do something else... but so far I haven't bothered. I would take PRs for this.

# Bugs

minecraft-switcher does not handle `server.properties` but it _really_ needs to.

# Author

AJ Jordan <alex@strugee.net>

# License

AGPL 3.0+
