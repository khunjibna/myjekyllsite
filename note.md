---
layout: default
title: Note
permalink: /note/
---

<div class="container mx-auto px-4 py-8">
  <h1 class="text-2xl font-bold mb-4">โพสต์จาก Nostr</h1>

  <!-- โปรไฟล์ -->
  <div class="flex items-center mb-6">
    <img id="profile-picture" src="/assets/images/default-avatar.png" class="w-16 h-16 rounded-full mr-4" />
    <div>
      <p id="profile-name" class="font-semibold text-lg"></p>
      <p id="profile-about" class="text-sm text-gray-600"></p>
    </div>
  </div>

  <!-- จำนวน follower / following -->
  <div class="mb-6 text-sm text-gray-500">
    <span id="followers"></span> · <span id="following"></span>
  </div>

  <!-- Notes จาก Nostr -->
  <div id="notes" class="space-y-4"></div>

  <!-- Pagination -->
  <div id="pagination" class="mt-8 flex flex-wrap gap-2"></div>
</div>