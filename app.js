const STORAGE_KEY = "fieldnotes-posts";

const postList = document.querySelector("#post-list");
const statusFilter = document.querySelector("#status-filter");
const editor = document.querySelector("#editor");
const preview = document.querySelector("#preview");
const form = document.querySelector("#post-form");
const notice = document.querySelector("#notice");

let posts = readPosts();
let editingId = null;

function readPosts() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? JSON.parse(saved) : [];
  } catch (error) {
    console.error("Couldn't read saved posts.", error);
    showNotice(
      "Your saved posts couldn't be read. Check your browser's storage settings.",
    );
    return [];
  }
}

function savePosts() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(posts));
    notice.hidden = true;
    return true;
  } catch (error) {
    console.error("Couldn't save posts.", error);
    showNotice(
      "This post couldn't be saved. Your browser may be out of storage.",
    );
    return false;
  }
}

function showNotice(message) {
  notice.textContent = message;
  notice.hidden = false;
}

function formatDate(timestamp) {
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(timestamp));
}

function makeAction(label, className, onClick) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = `text-button ${className || ""}`.trim();
  button.textContent = label;
  button.addEventListener("click", onClick);
  return button;
}

function renderPosts() {
  const filter = statusFilter.value;
  const visiblePosts = posts
    .filter((post) => filter === "all" || post.status === filter)
    .sort((a, b) => b.updatedAt - a.updatedAt);

  postList.replaceChildren();
  document.querySelector("#total-count").textContent = posts.length;
  document.querySelector("#published-count").textContent = posts.filter(
    (post) => post.status === "published",
  ).length;
  document.querySelector("#draft-count").textContent = posts.filter(
    (post) => post.status === "draft",
  ).length;

  if (!visiblePosts.length) {
    const empty = document.createElement("div");
    empty.className = "empty-state";

    const mark = document.createElement("div");
    mark.className = "empty-mark";
    mark.textContent = "✳";
    const heading = document.createElement("h3");
    const message = document.createElement("p");
    const button = document.createElement("button");
    button.className = "button button-dark";
    button.type = "button";

    if (posts.length === 0) {
      heading.textContent = "A blank page, in the best way.";
      message.textContent = "Your first post can start whenever you’re ready.";
      button.textContent = "Write your first post";
      button.addEventListener("click", () => openEditor());
    } else {
      heading.textContent = "Nothing in this pile just yet.";
      message.textContent = "Try another filter to see your other posts.";
      button.textContent = "Show all posts";
      button.addEventListener("click", () => {
        statusFilter.value = "all";
        renderPosts();
      });
    }

    empty.append(mark, heading, message, button);
    postList.append(empty);
    return;
  }

  visiblePosts.forEach((post) => {
    const card = document.createElement("article");
    card.className = "post-card";

    const main = document.createElement("div");
    main.className = "post-main";
    const meta = document.createElement("div");
    meta.className = "post-meta";
    const badge = document.createElement("span");
    badge.className = `status-pill ${post.status}`;
    badge.textContent = post.status === "published" ? "Published" : "Draft";
    const date = document.createElement("span");
    date.textContent = `Edited ${formatDate(post.updatedAt)}`;
    meta.append(badge, date);

    const title = document.createElement("h3");
    title.className = "post-title";
    title.textContent = post.title;
    const excerpt = document.createElement("p");
    excerpt.className = "post-excerpt";
    excerpt.textContent = post.excerpt || post.content;
    main.append(meta, title, excerpt);

    const actions = document.createElement("div");
    actions.className = "post-actions";
    actions.append(
      makeAction("Preview", "", () => openPreview(post)),
      makeAction("Edit", "", () => openEditor(post)),
      makeAction(
        post.status === "published" ? "Make draft" : "Publish",
        "",
        () => toggleStatus(post.id),
      ),
      makeAction("Delete", "delete", () => deletePost(post.id)),
    );
    card.append(main, actions);
    postList.append(card);
  });
}

function openEditor(post) {
  editingId = post ? post.id : null;
  form.reset();
  document.querySelector("#form-title").textContent = post
    ? "Edit your post"
    : "Write a post";
  document.querySelector("#form-eyebrow").textContent = post
    ? "BACK TO THE PAGE"
    : "A NEW PAGE";
  form.elements.title.value = post ? post.title : "";
  form.elements.excerpt.value = post ? post.excerpt : "";
  form.elements.content.value = post ? post.content : "";
  form.elements.status.value = post ? post.status : "draft";
  editor.showModal();
  form.elements.title.focus();
}

function openPreview(post) {
  document.querySelector("#preview-date").textContent =
    `${post.status === "published" ? "Published" : "Draft"} · ${formatDate(post.updatedAt)}`;
  document.querySelector("#preview-title").textContent = post.title;
  document.querySelector("#preview-excerpt").textContent = post.excerpt;
  document.querySelector("#preview-excerpt").hidden = !post.excerpt;
  document.querySelector("#preview-content").textContent = post.content;
  preview.showModal();
}

function toggleStatus(id) {
  const post = posts.find((item) => item.id === id);
  if (!post) return;

  const previousStatus = post.status;
  const previousUpdatedAt = post.updatedAt;
  post.status = post.status === "published" ? "draft" : "published";
  post.updatedAt = Date.now();
  if (savePosts()) {
    renderPosts();
  } else {
    post.status = previousStatus;
    post.updatedAt = previousUpdatedAt;
  }
}

function deletePost(id) {
  const post = posts.find((item) => item.id === id);
  if (!post || !window.confirm(`Delete “${post.title}”? This can't be undone.`))
    return;

  const previousPosts = posts;
  posts = posts.filter((item) => item.id !== id);
  if (savePosts()) {
    renderPosts();
  } else {
    posts = previousPosts;
  }
}

form.addEventListener("submit", (event) => {
  event.preventDefault();
  const now = Date.now();
  const existingPost = posts.find((post) => post.id === editingId);
  const previousPosts = posts;
  const post = {
    id: existingPost ? existingPost.id : crypto.randomUUID(),
    title: form.elements.title.value.trim(),
    excerpt: form.elements.excerpt.value.trim(),
    content: form.elements.content.value.trim(),
    status: form.elements.status.value,
    createdAt: existingPost ? existingPost.createdAt : now,
    updatedAt: now,
  };

  if (existingPost) {
    posts = posts.map((item) => (item.id === editingId ? post : item));
  } else {
    posts = [...posts, post];
  }

  if (savePosts()) {
    editor.close();
    renderPosts();
  } else {
    posts = previousPosts;
  }
});

document
  .querySelector("#new-post")
  .addEventListener("click", () => openEditor());
statusFilter.addEventListener("change", renderPosts);
document.querySelectorAll("[data-close]").forEach((button) => {
  button.addEventListener("click", () => button.closest("dialog").close());
});

renderPosts();
