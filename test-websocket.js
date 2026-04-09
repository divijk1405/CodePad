/**
 * WebSocket Load Test Script
 * Tests 8 concurrent editors in one room and measures round-trip time.
 *
 * Prerequisites:
 *   npm install sockjs-client @stomp/stompjs
 *
 * Usage:
 *   node test-websocket.js [ROOM_ID]
 *
 * If no ROOM_ID is provided, creates a new room via the API.
 */

const SockJS = require('sockjs-client');
const { Client } = require('@stomp/stompjs');

const SERVER = process.env.SERVER_URL || 'http://localhost:8080';
const NUM_CLIENTS = 8;
const NUM_MESSAGES = 10;

// Polyfill for SockJS in Node
Object.assign(global, { WebSocket: require('sockjs-client') });

async function createRoom() {
  const res = await fetch(`${SERVER}/api/rooms`, { method: 'POST' });
  const data = await res.json();
  return data.id;
}

function createClient(roomId, userId, username) {
  return new Promise((resolve, reject) => {
    const client = new Client({
      webSocketFactory: () => new SockJS(`${SERVER}/ws`),
      reconnectDelay: 0,
      onConnect: () => {
        // Subscribe to code changes
        client.subscribe(`/topic/room/${roomId}/code`, () => {});
        client.subscribe(`/topic/room/${roomId}/state`, () => {});

        // Join room
        client.publish({
          destination: `/app/room/${roomId}/join`,
          body: JSON.stringify({ userId, username }),
        });

        resolve(client);
      },
      onStompError: (frame) => {
        reject(new Error(`STOMP error: ${frame.headers.message}`));
      },
    });

    client.activate();

    setTimeout(() => reject(new Error('Connection timeout')), 10000);
  });
}

async function measureRoundTrip(senderClient, receiverClient, roomId, senderId) {
  return new Promise((resolve) => {
    const content = `test-${Date.now()}-${Math.random()}`;
    const start = performance.now();

    // Subscribe receiver to code changes and wait for this specific message
    const sub = receiverClient.subscribe(`/topic/room/${roomId}/code`, (message) => {
      const change = JSON.parse(message.body);
      if (change.content === content) {
        const rtt = performance.now() - start;
        sub.unsubscribe();
        resolve(rtt);
      }
    });

    // Send code change
    senderClient.publish({
      destination: `/app/room/${roomId}/code`,
      body: JSON.stringify({ userId: senderId, content }),
    });

    // Timeout fallback
    setTimeout(() => {
      sub.unsubscribe();
      resolve(-1);
    }, 5000);
  });
}

async function run() {
  console.log('=== CodePad WebSocket Load Test ===\n');

  // Create or use provided room
  let roomId = process.argv[2];
  if (!roomId) {
    console.log('Creating room...');
    roomId = await createRoom();
  }
  console.log(`Room: ${roomId}`);

  // Connect 8 clients
  console.log(`\nConnecting ${NUM_CLIENTS} clients...`);
  const clients = [];
  const userIds = [];

  for (let i = 0; i < NUM_CLIENTS; i++) {
    const userId = `test-user-${i}`;
    const username = `User${i}`;
    userIds.push(userId);

    try {
      const client = await createClient(roomId, userId, username);
      clients.push(client);
      process.stdout.write(`  Client ${i + 1}/${NUM_CLIENTS} connected\n`);
    } catch (err) {
      console.error(`  Client ${i} failed to connect: ${err.message}`);
      process.exit(1);
    }
  }

  console.log(`\nAll ${NUM_CLIENTS} clients connected!\n`);

  // Wait for all joins to propagate
  await new Promise((r) => setTimeout(r, 1000));

  // Measure round-trip times
  console.log(`Measuring round-trip time (${NUM_MESSAGES} messages)...\n`);
  const rtts = [];

  for (let i = 0; i < NUM_MESSAGES; i++) {
    const senderIdx = i % NUM_CLIENTS;
    const receiverIdx = (senderIdx + 1) % NUM_CLIENTS;

    const rtt = await measureRoundTrip(
      clients[senderIdx],
      clients[receiverIdx],
      roomId,
      userIds[senderIdx]
    );

    if (rtt >= 0) {
      rtts.push(rtt);
      console.log(`  Message ${i + 1}: ${rtt.toFixed(2)}ms (client ${senderIdx} -> client ${receiverIdx})`);
    } else {
      console.log(`  Message ${i + 1}: TIMEOUT`);
    }
  }

  // Report
  console.log('\n=== Results ===');
  if (rtts.length > 0) {
    const avg = rtts.reduce((a, b) => a + b, 0) / rtts.length;
    const min = Math.min(...rtts);
    const max = Math.max(...rtts);
    const p95 = rtts.sort((a, b) => a - b)[Math.floor(rtts.length * 0.95)];

    console.log(`  Clients connected: ${clients.length}`);
    console.log(`  Messages sent:     ${rtts.length}/${NUM_MESSAGES}`);
    console.log(`  Avg RTT:           ${avg.toFixed(2)}ms`);
    console.log(`  Min RTT:           ${min.toFixed(2)}ms`);
    console.log(`  Max RTT:           ${max.toFixed(2)}ms`);
    console.log(`  P95 RTT:           ${p95.toFixed(2)}ms`);
    console.log(`  Target (<100ms):   ${avg < 100 ? 'PASS' : 'FAIL'}`);
  } else {
    console.log('  No successful measurements');
  }

  // Cleanup
  console.log('\nDisconnecting clients...');
  for (const client of clients) {
    client.deactivate();
  }

  console.log('Done.');
  process.exit(0);
}

run().catch((err) => {
  console.error('Test failed:', err);
  process.exit(1);
});
