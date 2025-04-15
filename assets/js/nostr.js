// Standalone nostr.js
// ใช้กับ <script src="https://cdn.jsdelivr.net/npm/nostr-tools@2.12.0/lib/nostr.bundle.min.js"></script>

const relayUrls = [
  'wss://relay.damus.io',
  'wss://nos.lol',
  'wss://nostr.wine',
  'wss://relay.notoshi.win',
  'wss://relay.siamstr.com',
  'wss://relay.siamdev.cc/'
];

const publicKey = '0f9da41389e1239d267c43105ecfc92273079e80c2d4b09e1d1e172701bd07d7';
const receivedProfiles = new Set();
const receivedNotes = new Map();

relayUrls.forEach(relayUrl => {
  const ws = new WebSocket(relayUrl);
  ws.onopen = () => {
    const profileRequest = ["REQ", "sub_id_1", { authors: [publicKey], kinds: [0] }];
    const notesRequest = ["REQ", "sub_id_2", { authors: [publicKey], kinds: [1], limit: 100 }];
    ws.send(JSON.stringify(profileRequest));
    ws.send(JSON.stringify(notesRequest));
    fetchFollowersAndFollowing();
  };
  ws.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data);
      if (data[0] === "EVENT") {
        if (data[2].kind === 0) {
          const profile = JSON.parse(data[2].content);
          if (!receivedProfiles.has(profile.name)) {
            receivedProfiles.add(profile.name);
            displayProfile(profile);
          }
        } else if (data[2].kind === 1) {
          const eventId = data[2].id;
          const tags = data[2].tags || [];
          const isOriginalNote = !tags.some(tag => tag[0] === 'e');
          if (isOriginalNote && !receivedNotes.has(eventId)) {
            receivedNotes.set(eventId, {
              content: data[2].content,
              created_at: data[2].created_at
            });
          }
        }
      }
    } catch (e) {
      console.error("JSON Parse Error:", e);
    }
  };
});

function displayProfile(profile) {
  document.getElementById('profile-name').textContent = profile.name || 'N/A';
  document.getElementById('profile-about').textContent = profile.about || 'N/A';
  document.getElementById('profile-picture').src = profile.picture || 'default-avatar.png';
}

function fetchFollowersAndFollowing() {
  const ws = new WebSocket("wss://relay.damus.io");
  let followers = new Set();
  let followingCount = 0;
  ws.onopen = () => {
    ws.send(JSON.stringify(["REQ", "get_following", { kinds: [3], authors: [publicKey], limit: 1 }]));
    ws.send(JSON.stringify(["REQ", "get_followers", { kinds: [3], "#p": [publicKey], limit: 1000 }]));
  };
  ws.onmessage = (event) => {
    const data = JSON.parse(event.data);
    if (data[0] === "EVENT" && data[2].kind === 3) {
      const event = data[2];
      if (event.pubkey === publicKey) {
        const tags = event.tags || [];
        followingCount = tags.filter(tag => tag[0] === "p").length;
      }
      const tags = event.tags || [];
      const isFollower = tags.some(tag => tag[0] === "p" && tag[1] === publicKey);
      if (isFollower) {
        followers.add(event.pubkey);
      }
      document.getElementById('followers').textContent = `ผู้ติดตาม: ${followers.size}`;
      document.getElementById('following').textContent = `กำลังติดตาม: ${followingCount}`;
    }
  };
}

function displayNoteOrImage(noteContent, created_at) {
  const notesDiv = document.getElementById('notes');
  const container = document.createElement('div');
  container.className = "bg-white p-4 rounded-lg shadow text-gray-800 space-y-3";
  const imageRegex = /(https?:\/\/[^\s]+?\.(jpg|jpeg|png|gif|webp))/i;
  const imageMatch = noteContent.match(imageRegex);
  if (imageMatch) {
    const img = document.createElement('img');
    img.src = imageMatch[0];
    img.className = "w-full max-w-lg rounded-lg mx-auto";
    container.appendChild(img);
  }
  const youtubeRegex = /(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/;
  const youtubeMatch = noteContent.match(youtubeRegex);
  if (youtubeMatch) {
    const videoId = youtubeMatch[1];
    const iframe = document.createElement('iframe');
    iframe.src = `https://www.youtube.com/embed/${videoId}`;
    iframe.width = "100%";
    iframe.height = "315";
    iframe.className = "w-full rounded-lg";
    iframe.allow = "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture";
    iframe.allowFullscreen = true;
    container.appendChild(iframe);
  }
  const escaped = noteContent.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/\n/g, "<br>").replace(/(https?:\/\/[^\s<]+)/g, '<a href="$1" class="text-blue-600 underline" target="_blank">$1</a>');
  const noteElement = document.createElement('div');
  noteElement.innerHTML = escaped;
  container.appendChild(noteElement);
  const naddrRegex = /nostr:(naddr1[0-9a-z]+)/gi;
  const matches = [...noteContent.matchAll(naddrRegex)];
  matches.forEach(match => renderArticlePreview(match[1], container));
  const date = new Date(created_at * 1000);
  const formatted = date.toLocaleString("th-TH", { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  const timeElement = document.createElement('div');
  timeElement.className = "text-xs text-gray-500";
  timeElement.textContent = `โพสต์เมื่อ ${formatted}`;
  container.appendChild(timeElement);
  notesDiv.appendChild(container);
}

function displayLatestNotes(limit = 10) {
  const notesArray = Array.from(receivedNotes.values()).sort((a, b) => b.created_at - a.created_at).slice(0, limit);
  const notesDiv = document.getElementById('notes');
  notesDiv.innerHTML = '';
  notesArray.forEach(note => displayNoteOrImage(note.content, note.created_at));
}

document.addEventListener("DOMContentLoaded", () => {
  setTimeout(() => {
    const notesDiv = document.getElementById("notes");
    if (notesDiv) {
      displayLatestNotes(10);
    } else {
      console.warn("⚠️ ไม่พบ <div id='notes'> บนหน้า HTML");
    }
  }, 2000);
});

function renderArticlePreview(naddr, container) {
  if (!window.nip19) return console.error("nip19 not available");
  try {
    const decoded = window.nip19.decode(naddr);
    if (decoded.type !== "naddr") return;
    const { pubkey, identifier } = decoded.data;
    const articleReq = ["REQ", "sub_article", { kinds: [30023], authors: [pubkey], "#d": [identifier], limit: 1 }];
    const ws = new WebSocket("wss://relay.damus.io");
    ws.onopen = () => ws.send(JSON.stringify(articleReq));
    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data[0] === "EVENT" && data[2].kind === 30023) {
        const article = JSON.parse(data[2].content);
        const card = document.createElement('div');
        card.className = "bg-gray-50 border border-gray-200 rounded-lg p-4 space-y-2";
        card.innerHTML = `
          <div class="font-semibold text-lg">${article.title || 'ไม่มีชื่อบทความ'}</div>
          <div class="text-sm text-gray-600">${article.summary || ''}</div>
          ${article.image ? `<img src="${article.image}" class="rounded w-full max-w-md mt-2">` : ''}
          <div><a href="https://njump.me/${naddr}" target="_blank" class="text-blue-600 underline">อ่านบทความฉบับเต็ม</a></div>
        `;
        container.appendChild(card);
        ws.close();
      }
    };
  } catch (err) {
    console.error("decode ผิดพลาด:", err);
  }
}