const Discord = require("discord.js");
const { prefix, token } = require("./config.json");
const ytdl = require("ytdl-core");

const client = new Discord.Client();

const queue = new Map();

var volume = 2;

client.once("ready", () => {
  console.log("Ready!");
});
client.once("reconnecting", () => {
  console.log("Reconnecting!");
});
client.once("disconnect", () => {
  console.log("Disconnected!");
});

client.on("message", async message => {
  if (message.author.bot) return;
  if (!message.content.startsWith(prefix)) return;

  const serverQueue = queue.get(message.guild.id);
  if (message.content.trim() == `${prefix}play`) {
    return;
  } else if (message.content.startsWith(`${prefix}play`)) {
    execute(message, serverQueue);
    return;
  } else if (message.content.startsWith(`${prefix}skip`)) {
    skip(message, serverQueue);
    return;
  } else if (message.content.startsWith(`${prefix}stop`)) {
    stop(message, serverQueue);
    return;
  } else if (message.content.startsWith(`${prefix}volume`)) {
    stop(message, serverQueue);
    return;
  } else {
    message.channel.send("Fuck you, try again");
  }
});

async function execute(message, serverQueue) {
  const args = message.content.split(" ");
  if (!args[1].includes("youtu")) return;
  if (args[2]) {
    if (args[2] > 5) {
      volume = 5;
    } else if (args[2] < 1) {
      volume = 1;
    } else {
      volume = args[2];
    }
  }
  const voiceChannel = message.member.voiceChannel;
  if (!voiceChannel) {
    return message.channel.send("You need to be in a voice channel to play music!");
  }
  const permissions = voiceChannel.permissionsFor(message.client.user);
  if (!permissions.has("CONNECT") || !permissions.has("SPEAK")) {
    return message.channel.send("I need permission to join and speak in your voice channel!");
  }

  const songInfo = await ytdl.getInfo(args[1]);
  const song = {
    title: songInfo.title,
    url: songInfo.video_url
  };

  if (!serverQueue) {
  } else {
    serverQueue.songs.push(song);
    console.log(serverQueue.songs);
    return message.channel.send(`${song.title} has been added to the queue!`);
  }

  const queueConstruct = {
    textChannel: message.channel,
    voiceChannel: voiceChannel,
    connection: null,
    songs: [],
    volume: volume,
    playing: true
  };

  queue.set(message.guild.id, queueConstruct);

  queueConstruct.songs.push(song);

  try {
    var connection = await voiceChannel.join();
    queueConstruct.connection = connection;
    play(message.guild, queueConstruct.songs[0]);
  } catch (err) {
    console.log(err);
    queue.delete(message.guild.id);
    return message.channel.send(err);
  }
}

function play(guild, song) {
  const serverQueue = queue.get(guild.id);
  if (!song) {
    serverQueue.voiceChannel.leave();
    queue.delete(guild.id);
    return;
  }

  const dispatcher = serverQueue.connection
    .playStream(ytdl(song.url))
    .on("end", () => {
      console.log("Music ended!");
      serverQueue.songs.shift();
      play(guild, serverQueue.songs[0]);
    })
    .on("error", error => {
      console.error(error);
    });
  dispatcher.setVolumeLogarithmic(serverQueue.volume / 5);
}

function skip(message, serverQueue) {
  if (!message.member.voiceChannel)
    return message.channel.send("You have to be in a voice channel to stop the music!");
  if (!serverQueue) return message.channel.send("There is nothing to skip");
  serverQueue.connection.dispatcher.end();
}

function stop(message, serverQueue) {
  if (!message.member.voiceChannel)
    return message.channel.send("You have to be in a voice channel to stop the music!");
  serverQueue.songs = [];
  serverQueue.connection.dispatcher.end();
}

client.login(token);
