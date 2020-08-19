const rxjs = require("rxjs");
const Discord = require("discord.js");
const client = new Discord.Client();
const express = require("express");
const server = express();

const promClient = require("prom-client");
const Counter = promClient.Counter;
const promRegister = promClient.register;

// set up Prometheus metrics collecting
promClient.collectDefaultMetrics();

// set up custom Prometheus counter
const cmdCounter = new Counter({
  name: "bigceline_cmd",
  help: "Counts number of distinct commands",
  labelNames: ["directive"],
});

const BOT_TOKEN = process.env.BOT_TOKEN;
const PLEASUREDOME_MK_THREE_GUILD_ID =
  process.env.PLEASUREDOME_MK_THREE_GUILD_ID;
const PLEASUREDOME_BOT_SHIT_CHANNEL_ID =
  process.env.PLEASUREDOME_BOT_SHIT_CHANNEL_ID;
const BIG_CELINE_VOICE_CHANNEL_ID = process.env.BIG_CELINE_VOICE_CHANNEL_ID;
const PATH_TO_SONG = "../assets/thrilling_rhythm_heaven.mp3";

const PROMETHEUS_PORT = 6060;

let state = {
  channel: null,
  connection: null,
  dispatcher: null,
};
const stateSubscriber = new rxjs.Subject();
stateSubscriber.subscribe((newState) => {
  state = newState;
});

// connect initializes channel and connection on ctx
async function connect() {
  try {
    const channel = await client.channels.fetch(BIG_CELINE_VOICE_CHANNEL_ID);
    const connection = await channel.join();

    stateSubscriber.next({ ...state, channel, connection });
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
}

// play reads or initializes dispatcher on ctx
// play clears dispatcher from ctx
async function play() {
  try {
    if (state.dispatcher) {
      console.log("song already playing - resuming\n");
      state.dispatcher.resume();
      return;
    }

    let connection;

    // initialize connection and dispatcher if not already present
    if (!state.connection) {
      await connect();
      connection = state.connection;
    }

    const dispatcher = await connection.play(PATH_TO_SONG);
    dispatcher.on("finish", async () => {
      await stop();
    });

    stateSubscriber.next({
      ...state,
      dispatcher,
    });
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
}

// pause reads dispatcher from ctx
// pause does not remove anything from ctx
async function pause() {
  try {
    if (!state.dispatcher) {
      return;
    }
    await state.dispatcher.pause();
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
}

// stop tears down dispatchers and connections and deletes state from context
async function stop() {
  try {
    await state.dispatcher.destroy();
    await state.connection.disconnect();

    stateSubscriber.next({
      dispatcher: null,
      connection: null,
      channel: null,
    });
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
}

var commandSubscriber = new rxjs.Subject();

commandSubscriber.subscribe(async (command) => {
  switch (command) {
    case "play_magic_man":
      cmdCounter.inc({ directive: command });
      await play();
      break;
    case "pause_magic_man":
      cmdCounter.inc({ directive: command });
      await pause();
      break;
    case "stop_magic_man":
      cmdCounter.inc({ directive: command });
      await stop();
      break;
    default:
      cmdCounter.inc({ directive: "unknown" });
      break;
  }
});

client.on("ready", async () => {
  console.log("client just logged in successfully!\n");
});

client.on("message", async (msg) => {
  commandSubscriber.next(msg.content);
});

// TODO: regenerate this and figure out a better way to inject this later
// TODO: figure out explicit error case for failed login
// TODO: make this whole thing a state machine because that's what this more or
//       less is
// init the context object that will be shared across commands
client.login(BOT_TOKEN);

server.get("/metrics", async (req, res) => {
  try {
    res.set("Content-Type", promRegister.contentType);
    res.end(await promRegister.metrics());
  } catch (ex) {
    res.status(500).end(ex);
  }
});

// Start express server to serve Prometheus metrics
server.listen(PROMETHEUS_PORT);
