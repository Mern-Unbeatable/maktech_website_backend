# 📧 Frontend Guide: Implementing Real-time Email Polling

এই গাইডটিতে আপনার বর্তমান ইমেইল ড্যাশবোর্ড ডিজাইনের সাথে **"New message arrived, click to reload"** ফিচারটি কিভাবে যুক্ত করবেন, তার স্টেপ-বাই-স্টেপ গাইডলাইন দেওয়া হলো।

---

## ১. বর্তমান UI ডিজাইনে যে পরিবর্তনগুলো আনতে হবে

আপনার বর্তমান ডিজাইনে একটি সুন্দর ক্লিন টেবিল আছে। নতুন মেসেজ আসলে ইউজারকে জানানোর জন্য ডিজাইনে ছোট্ট একটি পরিবর্তন আনতে হবে:

* **Refresh / Notification Badge:** টেবিলের ঠিক উপরে, মাঝামাঝি জায়গায় অথবা টেবিলের হেডারের (Client Name, Subject) ঠিক উপরে একটি সুন্দর Floating Button বা Badge রাখতে পারেন। 
* **ডিজাইন আইডিয়া:** বাটনটির ব্যাকগ্রাউন্ড নীল (`#0b57d0`) বা লাল হতে পারে এবং টেক্সট সাদা হবে।
* **বিহেভিয়ার:** এই বাটনটি সাধারণত লুকানো (Hidden) থাকবে। শুধুমাত্র যখন ব্যাকগ্রাউন্ডে নতুন কোনো ইমেইল আসবে, তখনই এটি এনিমেট করে স্ক্রিনে ভেসে উঠবে।

```html
<!-- Example UI Structure -->
<div class="relative">
  <!-- New Message Alert (Hidden by default) -->
  <div v-if="hasNewEmails" class="absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-4">
    <button @click="refreshInbox" class="bg-blue-600 text-white px-4 py-2 rounded-full shadow-lg text-sm flex items-center gap-2 hover:bg-blue-700 transition">
      <svg>...</svg>
      New message arrived, click to reload
    </button>
  </div>

  <!-- Your existing Table Design -->
  <table class="w-full...">
    ...
  </table>
</div>
```

---

## ২. Frontend State (ভেরিয়েবল)

React বা Vue.js যেটাই ব্যবহার করেন না কেন, আপনার কম্পোনেন্টে নিচের স্টেটগুলো থাকতে হবে:

1. `emails` (Array): বর্তমানে স্ক্রিনে যে ইমেইলগুলো দেখাচ্ছে।
2. `hasNewEmails` (Boolean): নতুন ইমেইল এসেছে কি না (ডিফল্ট: `false`)।
3. `latestFetchedEmails` (Array): ব্যাকগ্রাউন্ড থেকে আনা নতুন ইমেইলগুলো সাময়িকভাবে এখানে সেভ থাকবে।

---

## ৩. Polling Logic (ব্যাকগ্রাউন্ডে API কল করা)

কম্পোনেন্ট যখন প্রথমবার লোড হবে (যেমন React এর `useEffect` বা Vue এর `onMounted`), তখন একটি `setInterval` চালু করতে হবে যা **প্রতি ৬৫ সেকেন্ড** পর পর API-তে কল করবে। (৬৫ সেকেন্ড দেওয়ার কারণ হলো ব্যাকএন্ডের ক্যাশে টাইম ৬০ সেকেন্ড)।

```javascript
// Example in React (useEffect) or Vue (onMounted)
let pollingInterval;

const startPolling = () => {
  // 65000 ms = 65 seconds
  pollingInterval = setInterval(async () => {
    try {
      // Fetch page 1 softly in the background
      const response = await fetch('/api/v1/emails/inbox?page=1&limit=8');
      const result = await response.json();
      
      const backgroundEmails = result.data;
      
      // Compare the first email ID to see if there's a new email
      if (backgroundEmails.length > 0 && emails.length > 0) {
        if (backgroundEmails[0].id !== emails[0].id) {
          // New email detected!
          setLatestFetchedEmails(backgroundEmails);
          setHasNewEmails(true); // This will show the UI badge
        }
      }
    } catch (error) {
      console.error("Polling error:", error);
    }
  }, 65000);
};

// Start the polling when component mounts
startPolling();

// Don't forget to clear the interval when the user leaves the page!
```

---

## ৪. Button Click Action (রিলোড করা)

ইউজার যখন **"New message arrived, click to reload"** বাটনে ক্লিক করবে, তখন নিচের ফাংশনটি কাজ করবে:

```javascript
const refreshInbox = () => {
  // 1. Replace the old emails with the new ones
  setEmails(latestFetchedEmails);
  
  // 2. Hide the notification badge
  setHasNewEmails(false);
  
  // 3. (Optional) Show a success toast message
  // toast.success("Inbox updated!");
}
```

---

## ৫. প্রো-টিপস (Pro-Tips)

1. **Pagination:** ইউজার যদি Page 2 বা Page 3 তে থাকে, তাহলে পোলিং (Polling) বন্ধ রাখা ভালো। কারণ Page 3 তে থাকা অবস্থায় নতুন ইমেইল আসলে সেটা তো Page 1 এ যোগ হবে। ইউজার Page 1 এ ফেরত আসলেই কেবল পোলিং চালু করতে পারেন।
2. **Error Handling:** ব্যাকগ্রাউন্ডে পোলিং করার সময় যদি কোনো নেটওয়ার্ক এরর (Error) আসে, তবে সেটা ইউজারকে দেখানোর দরকার নেই। `console.error` এ রেখে দিলেই হবে, যাতে ইউজারের কাজে ব্যাঘাত না ঘটে।
3. **Cache Sync:** ব্যাকএন্ডের ক্যাশে টাইম (৬০ সেকেন্ড) এবং ফ্রন্টএন্ডের পোলিং টাইম (৬৫ সেকেন্ড) সবসময় সামঞ্জস্য রাখবেন। পোলিং টাইম অবশ্যই ক্যাশে টাইমের চেয়ে ৩-৫ সেকেন্ড বেশি হতে হবে।

এই গাইডটি ফলো করে আপনি খুব সহজেই আপনার বর্তমান UI ডিজাইনে রিয়েল-টাইম ইমেইলের ফিলিংস নিয়ে আসতে পারবেন! 🚀
