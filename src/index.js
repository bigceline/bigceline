const Discord = require('discord.js');
const client = new Discord.Client();

const BOT_TOKEN = process.env.BOT_TOKEN;
const PLEASUREDOME_MK_THREE_GUILD_ID = process.env.PLEASUREDOME_MK_THREE_GUILD_ID;
const PLEASUREDOME_BOT_SHIT_CHANNEL_ID = process.env.PLEASUREDOME_BOT_SHIT_CHANNEL_ID;
const BIG_CELINE_VOICE_CHANNEL_ID = process.env.BIG_CELINE_VOICE_CHANNEL_ID;
const PATH_TO_SONG = '../assets/thrilling_rhythm_heaven.mp3'

// connect initializes channel and connection on ctx
async function connect(ctx) {
  try {
    const channel = await client.channels.fetch(BIG_CELINE_VOICE_CHANNEL_ID);
    const connection = await channel.join();

    ctx.channel = channel;
    ctx.connection = connection;
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
}

// play reads or initializes dispatcher on ctx
// play clears dispatcher from ctx
async function play(ctx) {
  try {
    if (ctx.dispatcher) {
      console.log('song already playing - resuming\n');
      ctx.dispatcher.resume();
      return;
    }

    // initialize connection and dispatcher if not already present
    if (!ctx.connection) {
      await connect(ctx);
      connection = ctx.connection;
    }
    ctx.dispatcher = await connection.play(PATH_TO_SONG);
    ctx.dispatcher.on('finish', async () => {
      await stop(ctx);
    });
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
}

// pause reads dispatcher from ctx
// pause does not remove anything from ctx
async function pause(ctx) {
  try {
    if (!ctx.dispatcher) {
      return;
    }
    await ctx.dispatcher.pause();
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
}

// stop tears down dispatchers and connections and deletes state from context
async function stop(ctx) {
  try {
    await ctx.dispatcher.destroy();
    await ctx.connection.disconnect();

    delete ctx.dispatcher;
    delete ctx.connection;
    delete ctx.channel;
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
}

client.on('ready', async () => {
  console.log('client just logged in successfully!\n');
});

const TEXT_TO_FNS = {
  'play_magic_man': [play],
  'pause_magic_man': [pause],
  'stop_magic_man': [stop]
};

client.on('message', async msg => {
  // restrict celine to listening only on TextChannel #bot-shit
  if (msg.channel.id !== PLEASUREDOME_BOT_SHIT_CHANNEL_ID) {
    return;
  }

  var command = msg.content;
  const respFns = TEXT_TO_FNS[command];
  if (!respFns) {
    return;
  }
  respFns.forEach(fn => fn(ctx));
});

// TODO: regenerate this and figure out a better way to inject this later
// TODO: figure out explicit error case for failed login
// TODO: make this whole thing a state machine because that's what this more or
//       less is
// init the context object that will be shared across commands
client.login(BOT_TOKEN);
var ctx = {};
