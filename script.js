function isGoogleDriveVideo(url) {
  return url.includes("drive.google.com");
}

function isGoogleDriveFile(url) {
  return url.includes("drive.google.com");
}

function getDrivePreviewUrl(url) {
  const match = url.match(/\/d\/([^/]+)/);
  if (match) {
    const fileId = match[1];
    // Use embed format for larger preview
    return `https://drive.google.com/file/d/${fileId}/preview`;
  }
  return url;
}

function getDriveImageUrl(url) {
  // Extract file ID from Google Drive URL (supports various formats)
  // Formats: /d/FILE_ID, /file/d/FILE_ID/view, /file/d/FILE_ID/preview, etc.
  let match = url.match(/\/d\/([a-zA-Z0-9_-]+)/);

  if (!match) {
    // Try alternative format: id=FILE_ID
    match = url.match(/[?&]id=([a-zA-Z0-9_-]+)/);
  }

  if (match) {
    const fileId = match[1];
    // Use Google Drive thumbnail format (more reliable than uc?export=view)
    // sz parameter controls size: w1000 = width 1000px
    return `https://drive.google.com/thumbnail?id=${fileId}&sz=w1000`;
  }

  // If no match, return original URL
  return url;
}

// Get all thumbnail sources from folder items (images + videos)
function getFolderThumbnailSources(folder) {
  // If folder has explicit thumbnail, return array with single item
  if (folder.thumbnail) {
    return [folder.thumbnail];
  }

  const thumbnailSources = [];

  if (folder.items && Array.isArray(folder.items) && folder.items.length > 0) {
    folder.items.forEach((item) => {
      if (item.type === "image") {
        // Add image src
        thumbnailSources.push(item.src);
      } else if (item.type === "video") {
        // For video, use thumbnail if available, otherwise use src
        if (item.thumbnail) {
          thumbnailSources.push(item.thumbnail);
        } else if (item.src) {
          // For Google Drive videos, we can use thumbnail format
          if (isGoogleDriveFile(item.src)) {
            const match = item.src.match(/\/d\/([a-zA-Z0-9_-]+)/);
            if (match) {
              thumbnailSources.push(
                `https://drive.google.com/thumbnail?id=${match[1]}&sz=w1000`
              );
            } else {
              thumbnailSources.push(item.src);
            }
          } else {
            thumbnailSources.push(item.src);
          }
        }
      }
    });
  }

  return thumbnailSources;
}

// Get initial thumbnail from folder (for first render)
function getFolderThumbnail(folder, index = 0) {
  const sources = getFolderThumbnailSources(folder);
  if (sources.length > 0) {
    return sources[index % sources.length];
  }
  return "";
}

// Global variables
let config = {};
let currentFeaturedIndex = 0;
let currentLightboxIndex = 0;
let allMediaItems = [];
let currentCategory = "all";
let currentMediaType = null; // 'image', 'video', or null (all)
let currentSortOrder = "newest"; // 'newest' or 'oldest'
let folderThumbnailIntervals = []; // Store intervals for cleanup

// Load configuration
async function loadConfig() {
  try {
    const response = await fetch("config.json");
    config = await response.json();
    initializeApp();
  } catch (error) {
    console.error("Error loading config:", error);
    alert("Error loading configuration. Please check config.json file.");
  }
}

// Initialize application
async function initializeApp() {
  setupNavigation();
  setupSectionTitles();
  generateFavicon();
  generateNavLogoIcon();
  await setupHero();
  setupScrollIndicator();
  setupFeaturedSlider();
  setupGallery();
  await setupAbout();
  setupContact();
  setupLightbox();
  setupFooter();
  setupWhatsApp();
  setupScrollAnimations();
}

// Setup section titles from config
function setupSectionTitles() {
  if (config.texts && config.texts.sectionTitles) {
    const galleryTitle = document.getElementById("galleryTitle");
    const aboutTitle = document.getElementById("aboutTitle");
    const contactTitle = document.getElementById("contactTitle");

    if (galleryTitle && config.texts.sectionTitles.gallery) {
      galleryTitle.textContent = config.texts.sectionTitles.gallery;
    }
    if (aboutTitle && config.texts.sectionTitles.about) {
      aboutTitle.textContent = config.texts.sectionTitles.about;
    }
    if (contactTitle && config.texts.sectionTitles.contact) {
      contactTitle.textContent = config.texts.sectionTitles.contact;
    }
  }
}

// Navigation setup
function setupNavigation() {
  const navbar = document.getElementById("navbar");
  const hamburger = document.getElementById("hamburger");
  const navMenu = document.getElementById("navMenu");
  const navLinks = document.querySelectorAll(".nav-link");
  const navContainer = document.querySelector(".nav-container");

  // Function to close mobile menu
  const closeMobileMenu = () => {
    navMenu.classList.remove("active");
    hamburger.classList.remove("active");
  };

  // Scroll effect
  window.addEventListener("scroll", () => {
    if (window.scrollY > 50) {
      navbar.classList.add("scrolled");
    } else {
      navbar.classList.remove("scrolled");
    }
  });

  // Mobile menu toggle
  hamburger.addEventListener("click", (e) => {
    e.stopPropagation();
    navMenu.classList.toggle("active");
    hamburger.classList.toggle("active");
  });

  // Close mobile menu on link click
  navLinks.forEach((link) => {
    link.addEventListener("click", () => {
      closeMobileMenu();
    });
  });

  // Close mobile menu when clicking outside navbar
  document.addEventListener("click", (e) => {
    // Check if menu is open
    if (navMenu.classList.contains("active")) {
      // Check if click is outside navbar and nav menu
      const isClickInsideNavbar = navbar.contains(e.target);
      const isClickOnHamburger = hamburger.contains(e.target);

      // Close if clicking outside navbar, but not if clicking hamburger (it has its own toggle)
      if (!isClickInsideNavbar && !isClickOnHamburger) {
        closeMobileMenu();
      }
    }
  });

  // Smooth scroll
  navLinks.forEach((link) => {
    link.addEventListener("click", (e) => {
      e.preventDefault();
      const targetId = link.getAttribute("href");
      const targetSection = document.querySelector(targetId);
      if (targetSection) {
        targetSection.scrollIntoView({ behavior: "smooth" });
      }
    });
  });
}

// Fetch Instagram profile data
async function fetchInstagramProfile() {
  if (
    !config.profile.useInstagramAPI ||
    !config.profile.instagramAPI.accessToken
  ) {
    return null;
  }

  try {
    const username =
      config.profile.instagramAPI.username ||
      config.profile.instagram.replace("@", "");
    const userId = config.profile.instagramAPI.userId;
    const accessToken = config.profile.instagramAPI.accessToken;

    // Try Instagram Graph API first
    if (userId && accessToken) {
      const apiUrl = `https://graph.instagram.com/${userId}?fields=id,username,account_type,media_count&access_token=${accessToken}`;
      const response = await fetch(apiUrl);

      if (response.ok) {
        const data = await response.json();
        return {
          username: data.username,
          accountType: data.account_type,
          mediaCount: data.media_count,
        };
      }
    }

    // Fallback: Try to get user info by username (requires different endpoint)
    // Note: Instagram Graph API doesn't support username lookup directly
    // This would require Instagram Basic Display API or a proxy service

    return null;
  } catch (error) {
    console.error("Error fetching Instagram profile:", error);
    return null;
  }
}

// Fetch Instagram profile picture
async function fetchInstagramProfilePicture() {
  if (
    !config.profile.useInstagramAPI ||
    !config.profile.instagramAPI.accessToken
  ) {
    return null;
  }

  try {
    const userId = config.profile.instagramAPI.userId;
    const accessToken = config.profile.instagramAPI.accessToken;

    if (userId && accessToken) {
      // Get user media and extract profile picture from first post or use default
      const apiUrl = `https://graph.instagram.com/${userId}/media?fields=media_url,media_type&limit=1&access_token=${accessToken}`;
      const response = await fetch(apiUrl);

      if (response.ok) {
        const data = await response.json();
        // Note: Instagram Graph API doesn't provide profile picture directly
        // You might need to use Instagram Basic Display API or store it manually
        return null;
      }
    }

    return null;
  } catch (error) {
    console.error("Error fetching Instagram profile picture:", error);
    return null;
  }
}

// Hero section setup
async function setupHero() {
  // Try to fetch Instagram data if enabled
  if (config.profile.useInstagramAPI) {
    const instagramData = await fetchInstagramBasicDisplayProfile();
    if (instagramData) {
      // Update Instagram username if different
      if (
        instagramData.username &&
        instagramData.username !== config.profile.instagram.replace("@", "")
      ) {
        config.profile.instagram = `@${instagramData.username}`;
      }
    }
  }

  document.getElementById("heroName").textContent = config.profile.name;
  document.getElementById("heroTitle").textContent = config.profile.title;

  // Setup CTA button text
  const ctaButton = document.querySelector(".cta-button");
  if (ctaButton && config.texts && config.texts.ctaButton) {
    ctaButton.textContent = config.texts.ctaButton;
  }

  // Setup profile image
  const profileImageContainer = document.getElementById("heroProfileImage");

  // Try to fetch Instagram profile picture if enabled
  if (config.profile.useInstagramAPI) {
    const instagramPhoto = await fetchInstagramProfilePicture();
    // Note: Instagram Graph API doesn't provide profile picture
    // You'll need to use Instagram Basic Display API or keep using config photo
  }

  if (config.profile.photo) {
    const img = document.createElement("img");
    // Check if photo is from Google Drive
    if (isGoogleDriveFile(config.profile.photo)) {
      img.src = getDriveImageUrl(config.profile.photo);
      // Add error handler in case direct link doesn't work
      img.onerror = function () {
        // Fallback: try uc?export=view format
        const match = config.profile.photo.match(/\/d\/([a-zA-Z0-9_-]+)/);
        if (match) {
          this.src = `https://drive.google.com/uc?export=view&id=${match[1]}`;
        }
      };
      // Add loading success message for debugging
      img.onload = function () {
        console.log("Profile photo loaded successfully from Google Drive");
      };
    } else {
      img.src = config.profile.photo;
    }
    img.alt = config.profile.name;
    profileImageContainer.appendChild(img);
  }
}

// Setup scroll indicator
function setupScrollIndicator() {
  const scrollIndicator = document.querySelector(".scroll-indicator");
  if (scrollIndicator) {
    scrollIndicator.addEventListener("click", () => {
      const gallerySection = document.getElementById("gallery");
      if (gallerySection) {
        gallerySection.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    });
  }
}

// Featured slider setup
function setupFeaturedSlider() {
  const wrapper = document.getElementById("featuredWrapper");
  const dotsContainer = document.getElementById("featuredDots");
  const prevBtn = document.getElementById("prevFeatured");
  const nextBtn = document.getElementById("nextFeatured");

  if (!config.featured || config.featured.length === 0) {
    document.querySelector(".featured-slider").style.display = "none";
    return;
  }

  // Create slider items
  config.featured.forEach((item, index) => {
    const sliderItem = document.createElement("div");
    sliderItem.className = "slider-item";

    if (item.type === "video") {
      if (isGoogleDriveVideo(item.src)) {
        const iframe = document.createElement("iframe");
        iframe.src = getDrivePreviewUrl(item.src);
        iframe.allow = "autoplay";
        iframe.allowFullscreen = true;
        iframe.style.width = "100%";
        iframe.style.height = "100%";
        iframe.style.border = "none";
        sliderItem.appendChild(iframe);
      } else {
        const video = document.createElement("video");
        video.src = item.src;
        video.muted = true;
        video.loop = true;
        video.autoplay = index === 0;
        sliderItem.appendChild(video);
      }
    } else {
      const img = document.createElement("img");
      // Check if image is from Google Drive
      if (isGoogleDriveFile(item.src)) {
        img.src = getDriveImageUrl(item.src);
      } else {
        img.src = item.src;
      }
      img.alt = item.title;
      sliderItem.appendChild(img);
    }

    const content = document.createElement("div");
    content.className = "slider-item-content";
    content.innerHTML = `
            <h3>${item.title}</h3>
            <p>${item.description}</p>
        `;
    sliderItem.appendChild(content);
    wrapper.appendChild(sliderItem);

    // Create dot
    const dot = document.createElement("div");
    dot.className = "dot" + (index === 0 ? " active" : "");
    dot.addEventListener("click", () => goToSlide(index));
    dotsContainer.appendChild(dot);
  });

  // Navigation buttons
  prevBtn.addEventListener("click", () => {
    currentFeaturedIndex =
      (currentFeaturedIndex - 1 + config.featured.length) %
      config.featured.length;
    goToSlide(currentFeaturedIndex);
  });

  nextBtn.addEventListener("click", () => {
    currentFeaturedIndex = (currentFeaturedIndex + 1) % config.featured.length;
    goToSlide(currentFeaturedIndex);
  });

  // Auto-play slider
  setInterval(() => {
    currentFeaturedIndex = (currentFeaturedIndex + 1) % config.featured.length;
    goToSlide(currentFeaturedIndex);
  }, 5000);
}

function goToSlide(index) {
  const wrapper = document.getElementById("featuredWrapper");
  const dots = document.querySelectorAll(".dot");

  currentFeaturedIndex = index;
  wrapper.scrollTo({
    left: index * wrapper.offsetWidth,
    behavior: "smooth",
  });

  dots.forEach((dot, i) => {
    dot.classList.toggle("active", i === index);
  });
}

// Gallery setup
function setupGallery() {
  const filtersContainer = document.getElementById("categoryFilters");
  const galleryGrid = document.getElementById("galleryGrid");

  // Create type filter section
  const typeFilterSection = document.createElement("div");
  typeFilterSection.className = "type-filters";

  // Create "Foto" filter button
  const fotoBtn = document.createElement("button");
  fotoBtn.className = "filter-btn type-filter";
  fotoBtn.innerHTML = '<i class="bx bx-image"></i> <span>Foto</span>';
  fotoBtn.setAttribute("data-type", "image");
  fotoBtn.addEventListener("click", () => toggleMediaType("image"));
  typeFilterSection.appendChild(fotoBtn);

  // Create "Video" filter button
  const videoBtn = document.createElement("button");
  videoBtn.className = "filter-btn type-filter";
  videoBtn.innerHTML = '<i class="bx bx-video"></i> <span>Video</span>';
  videoBtn.setAttribute("data-type", "video");
  videoBtn.addEventListener("click", () => toggleMediaType("video"));
  typeFilterSection.appendChild(videoBtn);

  filtersContainer.appendChild(typeFilterSection);

  // Create category filter section
  const categoryFilterSection = document.createElement("div");
  categoryFilterSection.className = "category-filters-section";

  // Create "All" filter button
  const allBtn = document.createElement("button");
  allBtn.className = "filter-btn category-filter active";
  allBtn.textContent = "All";
  allBtn.setAttribute("data-category", "all");
  allBtn.addEventListener("click", () => toggleCategory("all"));
  categoryFilterSection.appendChild(allBtn);

  // Create category filter buttons
  config.categories.forEach((category) => {
    const btn = document.createElement("button");
    btn.className = "filter-btn category-filter";
    btn.textContent = category.name;
    btn.setAttribute("data-category", category.id);
    btn.addEventListener("click", () => toggleCategory(category.id));
    categoryFilterSection.appendChild(btn);

    // Collect all media items (including folders)
    category.media.forEach((media) => {
      if (media.type === "folder") {
        // Add folder as a media item
        allMediaItems.push({
          ...media,
          category: category.id,
          categoryName: category.name,
        });
        // Also add folder items as individual items for filtering
        if (media.items && Array.isArray(media.items)) {
          media.items.forEach((item) => {
            allMediaItems.push({
              ...item,
              category: category.id,
              categoryName: category.name,
              folderId: media.id,
              folderName: media.title,
            });
          });
        }
      } else {
        allMediaItems.push({
          ...media,
          category: category.id,
          categoryName: category.name,
        });
      }
    });
  });

  filtersContainer.appendChild(categoryFilterSection);

  // Create sort section
  const sortSection = document.createElement("div");
  sortSection.className = "sort-section";

  const sortLabel = document.createElement("span");
  sortLabel.className = "sort-label";
  sortLabel.textContent = "Urutkan:";
  sortSection.appendChild(sortLabel);

  const sortButtonsContainer = document.createElement("div");
  sortButtonsContainer.className = "sort-buttons";

  const newestBtn = document.createElement("button");
  newestBtn.className = "sort-btn active";
  newestBtn.setAttribute("data-sort", "newest");
  const newestLabel =
    config.texts && config.texts.sortOptions && config.texts.sortOptions.newest
      ? config.texts.sortOptions.newest
      : "Terbaru";
  newestBtn.innerHTML =
    '<i class="bx bx-sort-down"></i> <span>' + newestLabel + "</span>";
  newestBtn.addEventListener("click", () => toggleSort("newest"));
  sortButtonsContainer.appendChild(newestBtn);

  const oldestBtn = document.createElement("button");
  oldestBtn.className = "sort-btn";
  oldestBtn.setAttribute("data-sort", "oldest");
  const oldestLabel =
    config.texts && config.texts.sortOptions && config.texts.sortOptions.oldest
      ? config.texts.sortOptions.oldest
      : "Terlama";
  oldestBtn.innerHTML =
    '<i class="bx bx-sort-up"></i> <span>' + oldestLabel + "</span>";
  oldestBtn.addEventListener("click", () => toggleSort("oldest"));
  sortButtonsContainer.appendChild(oldestBtn);

  sortSection.appendChild(sortButtonsContainer);
  filtersContainer.appendChild(sortSection);

  // Setup folder back button (desktop)
  const folderBackBtn = document.getElementById("folderBackBtn");
  if (folderBackBtn) {
    folderBackBtn.addEventListener("click", closeFolder);
  }

  // Setup folder back button (mobile)
  const folderBackBtnMobile = document.getElementById("folderBackBtnMobile");
  if (folderBackBtnMobile) {
    folderBackBtnMobile.addEventListener("click", closeFolder);
  }

  // Setup navbar back button
  const navbarBackBtn = document.getElementById("navbarBackBtn");
  if (navbarBackBtn) {
    navbarBackBtn.addEventListener("click", closeFolder);
  }

  // Render initial gallery
  applyFilters();
}

function toggleCategory(categoryId) {
  // If clicking the same category, toggle it off (back to 'all')
  if (currentCategory === categoryId && categoryId !== "all") {
    currentCategory = "all";
  } else {
    currentCategory = categoryId;
  }

  // Update category filter buttons
  document.querySelectorAll(".category-filter").forEach((btn) => {
    btn.classList.remove("active");
    const btnCategory = btn.getAttribute("data-category");
    if (btnCategory === currentCategory) {
      btn.classList.add("active");
    }
  });

  applyFilters();
}

function toggleMediaType(mediaType) {
  // Toggle media type filter
  if (currentMediaType === mediaType) {
    currentMediaType = null; // Deselect if already selected
  } else {
    currentMediaType = mediaType;
  }

  // Update type filter buttons
  document.querySelectorAll(".type-filter").forEach((btn) => {
    btn.classList.remove("active");
    const btnType = btn.getAttribute("data-type");
    if (btnType === currentMediaType) {
      btn.classList.add("active");
    }
  });

  applyFilters();
}

function toggleSort(sortOrder) {
  currentSortOrder = sortOrder;

  // Update sort buttons
  document.querySelectorAll(".sort-btn").forEach((btn) => {
    btn.classList.remove("active");
    const btnSort = btn.getAttribute("data-sort");
    if (btnSort === currentSortOrder) {
      btn.classList.add("active");
    }
  });

  applyFilters();
}

function formatDate(dateString) {
  if (!dateString) return "";

  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return dateString;

    const dateFormat =
      config.texts && config.texts.dateFormat && config.texts.dateFormat.display
        ? config.texts.dateFormat.display
        : "DD MMMM YYYY";
    const locale =
      config.texts && config.texts.dateFormat && config.texts.dateFormat.locale
        ? config.texts.dateFormat.locale
        : "id-ID";

    // Format tanggal sesuai dengan konfigurasi
    const options = {
      year: "numeric",
      month: "long",
      day: "numeric",
    };

    return date.toLocaleDateString(locale, options);
  } catch (error) {
    console.error("Error formatting date:", error);
    return dateString;
  }
}

function applyFilters() {
  let filteredItems = [...allMediaItems];

  // Apply category filter
  if (currentCategory !== "all") {
    filteredItems = filteredItems.filter(
      (item) => item.category === currentCategory
    );
  }

  // Filter out items that belong to folders (only show folders, not their individual items)
  filteredItems = filteredItems.filter(
    (item) => item.type === "folder" || !item.folderId
  );

  // Apply media type filter
  if (currentMediaType) {
    filteredItems = filteredItems.filter(
      (item) => item.type === currentMediaType || item.type === "folder"
    );
  }

  // Apply sorting
  filteredItems.sort((a, b) => {
    const dateA = a.date ? new Date(a.date).getTime() : 0;
    const dateB = b.date ? new Date(b.date).getTime() : 0;

    if (currentSortOrder === "newest") {
      return dateB - dateA; // Terbaru dulu (tanggal lebih besar dulu)
    } else {
      return dateA - dateB; // Terlama dulu (tanggal lebih kecil dulu)
    }
  });

  renderGallery(filteredItems);
}

function renderGallery(items) {
  const galleryGrid = document.getElementById("galleryGrid");

  // Clear previous thumbnail intervals
  folderThumbnailIntervals.forEach((interval) => clearInterval(interval));
  folderThumbnailIntervals = [];

  galleryGrid.innerHTML = "";

  // Re-setup scroll animations after gallery is rendered
  setTimeout(() => {
    setupScrollAnimations();
  }, 100);

  // Show empty state if no items
  if (items.length === 0) {
    const emptyState = document.createElement("div");
    emptyState.className = "gallery-empty";

    const emptyTitle =
      config.texts && config.texts.emptyState && config.texts.emptyState.title
        ? config.texts.emptyState.title
        : "Tidak ada konten";
    const emptyMessage =
      config.texts && config.texts.emptyState && config.texts.emptyState.message
        ? config.texts.emptyState.message
        : "Kategori ini belum memiliki konten. Silakan pilih kategori lain.";

    emptyState.innerHTML = `
            <i class="bx bx-image-alt"></i>
            <h3>${emptyTitle}</h3>
            <p>${emptyMessage}</p>
        `;
    galleryGrid.appendChild(emptyState);
    return;
  }

  items.forEach((item, index) => {
    const galleryItem = document.createElement("div");
    galleryItem.className =
      item.type === "folder" ? "gallery-item folder-item" : "gallery-item";

    if (item.type === "folder") {
      galleryItem.addEventListener("click", () => openFolder(item));
    } else {
      galleryItem.addEventListener("click", () => openLightbox(items, index));
    }

    if (item.type === "folder") {
      // Render folder item with dynamic rotating thumbnail (carousel style)
      const thumbnailContainer = document.createElement("div");
      thumbnailContainer.className = "thumbnail-container";

      const thumbnailSources = getFolderThumbnailSources(item);

      // Get initial thumbnail
      let currentThumbnailIndex = 0;
      let thumbnailSrc = getFolderThumbnail(item, currentThumbnailIndex);

      // Check if thumbnail is from Google Drive
      if (thumbnailSrc && isGoogleDriveFile(thumbnailSrc)) {
        thumbnailSrc = getDriveImageUrl(thumbnailSrc);
      }

      // Create initial image
      const currentImg = document.createElement("img");
      currentImg.src = thumbnailSrc || "";
      currentImg.alt = item.title;
      currentImg.classList.add("thumbnail-current");
      thumbnailContainer.appendChild(currentImg);

      galleryItem.appendChild(thumbnailContainer);

      // Rotate thumbnail every 3 seconds if there are multiple sources
      if (thumbnailSources.length > 1) {
        const rotateThumbnail = () => {
          // Get next thumbnail index
          const nextIndex =
            (currentThumbnailIndex + 1) % thumbnailSources.length;
          let nextThumbnailSrc = thumbnailSources[nextIndex];

          // Check if thumbnail is from Google Drive
          if (nextThumbnailSrc && isGoogleDriveFile(nextThumbnailSrc)) {
            nextThumbnailSrc = getDriveImageUrl(nextThumbnailSrc);
          }

          // Create next image element (positioned to the right)
          const nextImg = document.createElement("img");
          nextImg.src = nextThumbnailSrc;
          nextImg.alt = item.title;
          nextImg.classList.add("thumbnail-next");
          thumbnailContainer.appendChild(nextImg);

          // Trigger animation: current slides left, next slides in from right
          setTimeout(() => {
            currentImg.classList.remove("thumbnail-current");
            currentImg.classList.add("thumbnail-slide-out");

            nextImg.classList.remove("thumbnail-next");
            nextImg.classList.add("thumbnail-slide-in");
          }, 50);

          // After animation completes, remove old image and update current
          setTimeout(() => {
            currentImg.remove();
            nextImg.classList.remove("thumbnail-slide-in");
            nextImg.classList.add("thumbnail-current");

            // Update reference for next rotation
            currentThumbnailIndex = nextIndex;
          }, 650); // Wait for animation to complete (600ms + 50ms buffer)
        };

        // Start rotation every 3 seconds
        const thumbnailInterval = setInterval(rotateThumbnail, 3000);

        // Store interval ID for cleanup
        folderThumbnailIntervals.push(thumbnailInterval);
      }

      const overlay = document.createElement("div");
      overlay.className = "gallery-item-overlay";
      const formattedDate = item.date ? formatDate(item.date) : "";
      const itemCount = item.items ? item.items.length : 0;
      const itemLabel =
        config.texts &&
        config.texts.folderLabels &&
        config.texts.folderLabels.items
          ? config.texts.folderLabels.items
          : "item";
      overlay.innerHTML = `
        <div class="folder-icon"><i class="bx bx-folder"></i></div>
        <h3>${item.title}</h3>
        <p>${item.description}</p>
        <span class="folder-item-count">${itemCount} ${itemLabel}</span>
        ${
          formattedDate
            ? `<span class="gallery-item-date"><i class="bx bx-calendar"></i> ${formattedDate}</span>`
            : ""
        }
      `;
      galleryItem.appendChild(overlay);
      galleryGrid.appendChild(galleryItem);
      return; // Stop here, don't create another overlay
    } else if (item.type === "video") {
      galleryItem.setAttribute("data-type", "video");
      // Check if video has a custom thumbnail
      if (item.thumbnail) {
        const img = document.createElement("img");
        // Check if thumbnail is from Google Drive
        if (isGoogleDriveFile(item.thumbnail)) {
          img.src = getDriveImageUrl(item.thumbnail);
          img.onerror = function () {
            // Fallback to original thumbnail URL if Google Drive conversion fails
            this.src = item.thumbnail;
          };
        } else {
          img.src = item.thumbnail;
        }
        img.alt = item.title;
        galleryItem.appendChild(img);
      } else if (isGoogleDriveVideo(item.src)) {
        const iframe = document.createElement("iframe");
        iframe.src = getDrivePreviewUrl(item.src);
        iframe.allow = "autoplay; fullscreen";
        iframe.allowFullscreen = true;
        iframe.setAttribute("frameborder", "0");
        iframe.setAttribute("scrolling", "no");
        galleryItem.appendChild(iframe);
      } else {
        const video = document.createElement("video");
        video.src = item.src;
        video.muted = true;
        video.loop = true;
        galleryItem.appendChild(video);
      }
    } else {
      const img = document.createElement("img");
      // Check if image is from Google Drive
      if (isGoogleDriveFile(item.src)) {
        img.src = getDriveImageUrl(item.src);
      } else {
        img.src = item.src;
      }
      img.alt = item.title;
      galleryItem.appendChild(img);
    }

    const overlay = document.createElement("div");
    overlay.className = "gallery-item-overlay";
    const formattedDate = item.date ? formatDate(item.date) : "";
    overlay.innerHTML = `
            ${
              item.type === "video"
                ? '<div class="video-play-icon"><i class="bx bx-play-circle"></i></div>'
                : item.type === "image"
                ? '<div class="image-icon"><i class="bx bx-image"></i></div>'
                : ""
            }
            <h3>${item.title}</h3>
            <p>${item.description}</p>
            ${
              formattedDate
                ? `<span class="gallery-item-date"><i class="bx bx-calendar"></i> ${formattedDate}</span>`
                : ""
            }
        `;
    galleryItem.appendChild(overlay);

    galleryGrid.appendChild(galleryItem);
  });
}

// Open folder detail view
function openFolder(folder) {
  const galleryGrid = document.getElementById("galleryGrid");
  const folderDetailView = document.getElementById("folderDetailView");
  const folderDetailTitle = document.getElementById("folderDetailTitle");
  const folderDetailDescription = document.getElementById(
    "folderDetailDescription"
  );
  const folderItemsGrid = document.getElementById("folderItemsGrid");
  const folderBackBtn = document.getElementById("folderBackBtn");
  const folderBackText = document.getElementById("folderBackText");

  // Hide gallery grid
  galleryGrid.style.display = "none";

  // Show folder detail view
  folderDetailView.style.display = "block";

  // Add back button to navbar
  const navbar = document.getElementById("navbar");
  navbar.classList.add("folder-view-active");

  // Show navbar back button
  const navbarBackBtn = document.getElementById("navbarBackBtn");
  if (navbarBackBtn) {
    navbarBackBtn.style.display = "block";
  }

  // Set folder info
  folderDetailTitle.textContent = folder.title;
  folderDetailDescription.textContent = folder.description || "";

  // Set back button text
  const backText =
    config.texts &&
    config.texts.folderLabels &&
    config.texts.folderLabels.backToGallery
      ? config.texts.folderLabels.backToGallery
      : "Kembali ke Gallery";
  folderBackText.textContent = backText;

  // Set mobile back button text
  const folderBackTextMobile = document.getElementById("folderBackTextMobile");
  if (folderBackTextMobile) {
    folderBackTextMobile.textContent = backText;
  }

  // Clear and render folder items
  folderItemsGrid.innerHTML = "";

  if (folder.items && folder.items.length > 0) {
    folder.items.forEach((item, index) => {
      const folderItem = document.createElement("div");
      folderItem.className = "gallery-item";
      folderItem.addEventListener("click", () =>
        openLightbox(folder.items, index)
      );

      if (item.type === "video") {
        if (isGoogleDriveVideo(item.src)) {
          const iframe = document.createElement("iframe");
          iframe.src = getDrivePreviewUrl(item.src);
          iframe.allow = "autoplay";
          iframe.style.width = "100%";
          iframe.style.height = "100%";
          iframe.style.border = "none";
          folderItem.appendChild(iframe);
        } else {
          const video = document.createElement("video");
          video.src = item.src;
          video.muted = true;
          video.loop = true;
          folderItem.appendChild(video);
        }
      } else {
        const img = document.createElement("img");
        // Check if image is from Google Drive
        if (isGoogleDriveFile(item.src)) {
          img.src = getDriveImageUrl(item.src);
        } else {
          img.src = item.src;
        }
        img.alt = item.title;
        folderItem.appendChild(img);
      }

      const overlay = document.createElement("div");
      overlay.className = "gallery-item-overlay";
      const formattedDate = item.date ? formatDate(item.date) : "";
      overlay.innerHTML = `
        ${
          item.type === "video"
            ? '<div class="video-play-icon"><i class="bx bx-play-circle"></i></div>'
            : item.type === "image"
            ? '<div class="image-icon"><i class="bx bx-image"></i></div>'
            : ""
        }
        <h3>${item.title}</h3>
        <p>${item.description}</p>
        ${
          formattedDate
            ? `<span class="gallery-item-date"><i class="bx bx-calendar"></i> ${formattedDate}</span>`
            : ""
        }
      `;
      folderItem.appendChild(overlay);

      folderItemsGrid.appendChild(folderItem);
    });
  } else {
    const emptyState = document.createElement("div");
    emptyState.className = "gallery-empty";
    emptyState.innerHTML = `
      <i class="bx bx-folder-open"></i>
      <h3>Folder Kosong</h3>
      <p>Folder ini belum memiliki konten.</p>
    `;
    folderItemsGrid.appendChild(emptyState);
  }

  // Scroll to top
  folderDetailView.scrollIntoView({ behavior: "smooth", block: "start" });
}

// Close folder detail view and return to gallery
function closeFolder() {
  const galleryGrid = document.getElementById("galleryGrid");
  const folderDetailView = document.getElementById("folderDetailView");
  const navbar = document.getElementById("navbar");

  folderDetailView.style.display = "none";
  galleryGrid.style.display = "grid";
  navbar.classList.remove("folder-view-active");

  // Hide navbar back button
  const navbarBackBtn = document.getElementById("navbarBackBtn");
  if (navbarBackBtn) {
    navbarBackBtn.style.display = "none";
  }

  // Scroll to gallery section
  document
    .getElementById("gallery")
    .scrollIntoView({ behavior: "smooth", block: "start" });
}

// About section setup
async function setupAbout() {
  let bio = config.profile.bio;

  // Try to fetch Instagram bio if API is enabled
  // Note: Instagram Graph API doesn't provide bio directly
  // You need Instagram Basic Display API for this, or use a proxy service
  if (
    config.profile.useInstagramAPI &&
    config.profile.instagramAPI.accessToken
  ) {
    try {
      // Instagram Basic Display API endpoint for user info
      // This requires different setup than Graph API
      // For now, we keep using config bio
    } catch (error) {
      console.error("Error fetching Instagram bio:", error);
    }
  }

  document.getElementById("aboutText").textContent = bio;

  const detailsContainer = document.getElementById("aboutDetails");
  const labels =
    config.texts && config.texts.aboutLabels
      ? config.texts.aboutLabels
      : {
          location: "Location",
          email: "Email",
          instagram: "Instagram",
        };

  detailsContainer.innerHTML = `
        <div class="about-detail-item">
            <i class="bx bx-map"></i>
            <div>
                <strong>${labels.location}</strong>
                <span>${config.profile.location}</span>
            </div>
        </div>
        <div class="about-detail-item">
            <i class="bx bx-envelope"></i>
            <div>
                <strong>${labels.email}</strong>
                <span><a href="mailto:${config.profile.email}" style="color: var(--gray-light); text-decoration: none;">${config.profile.email}</a></span>
            </div>
        </div>
        <div class="about-detail-item">
            <i class="bx bxl-instagram"></i>
            <div>
                <strong>${labels.instagram}</strong>
                <span>${config.profile.instagram}</span>
            </div>
        </div>
    `;
}

// Contact section setup
function setupContact() {
  const contactContainer = document.getElementById("contactContent");
  contactContainer.innerHTML = "";

  // Check if socialMedia array exists in config
  if (
    config.socialMedia &&
    Array.isArray(config.socialMedia) &&
    config.socialMedia.length > 0
  ) {
    config.socialMedia.forEach((social) => {
      const contactItem = document.createElement("div");
      contactItem.className = "contact-item";

      const link = document.createElement("a");
      link.href = social.url;
      if (social.url.startsWith("http")) {
        link.target = "_blank";
        link.rel = "noopener noreferrer";
      }

      const icon = document.createElement("i");
      icon.className = social.icon;
      link.appendChild(icon);

      const text = document.createElement("span");
      text.textContent = social.text || social.name;
      link.appendChild(text);

      contactItem.appendChild(link);
      contactContainer.appendChild(contactItem);
    });
  } else {
    // Fallback to old method if socialMedia not configured
    contactContainer.innerHTML = `
            <div class="contact-item">
                <a href="mailto:${config.profile.email}">
                    <i class="bx bx-envelope"></i>
                    <span>${config.profile.email}</span>
                </a>
            </div>
            <div class="contact-item">
                <a href="https://instagram.com/${config.profile.instagram.replace(
                  "@",
                  ""
                )}" target="_blank">
                    <i class="bx bxl-instagram"></i>
                    <span>${config.profile.instagram}</span>
                </a>
            </div>
        `;
  }
}

// Lightbox setup
function setupLightbox() {
  const lightbox = document.getElementById("lightbox");
  const closeBtn = document.getElementById("lightboxClose");
  const prevBtn = document.getElementById("lightboxPrev");
  const nextBtn = document.getElementById("lightboxNext");
  const content = document.getElementById("lightboxContent");

  closeBtn.addEventListener("click", () => {
    lightbox.classList.remove("active");
    document.body.style.overflow = "";
  });

  lightbox.addEventListener("click", (e) => {
    if (e.target === lightbox) {
      lightbox.classList.remove("active");
      document.body.style.overflow = "";
    }
  });

  prevBtn.addEventListener("click", () => {
    navigateLightbox(-1);
  });

  nextBtn.addEventListener("click", () => {
    navigateLightbox(1);
  });

  // Keyboard navigation
  document.addEventListener("keydown", (e) => {
    if (lightbox.classList.contains("active")) {
      if (e.key === "Escape") {
        lightbox.classList.remove("active");
        document.body.style.overflow = "";
      } else if (e.key === "ArrowLeft") {
        navigateLightbox(-1);
      } else if (e.key === "ArrowRight") {
        navigateLightbox(1);
      }
    }
  });
}

let currentLightboxItems = [];

function openLightbox(items, index) {
  const lightbox = document.getElementById("lightbox");
  const content = document.getElementById("lightboxContent");

  currentLightboxIndex = index;
  currentLightboxItems = items;
  document.body.style.overflow = "hidden";
  lightbox.classList.add("active");

  updateLightboxContent();
}

function navigateLightbox(direction) {
  currentLightboxIndex =
    (currentLightboxIndex + direction + currentLightboxItems.length) %
    currentLightboxItems.length;
  updateLightboxContent();
}

function updateLightboxContent() {
  const content = document.getElementById("lightboxContent");
  const item = currentLightboxItems[currentLightboxIndex];

  content.innerHTML = "";

  if (item.type === "video") {
    if (isGoogleDriveVideo(item.src)) {
      const iframe = document.createElement("iframe");
      iframe.src = getDrivePreviewUrl(item.src);
      iframe.allow = "autoplay; fullscreen";
      iframe.allowFullscreen = true;
      iframe.setAttribute("frameborder", "0");
      iframe.setAttribute("scrolling", "no");
      content.appendChild(iframe);
    } else {
      const video = document.createElement("video");
      video.src = item.src;
      video.controls = true;
      video.autoplay = true;
      video.style.maxWidth = "90vw";
      video.style.maxHeight = "90vh";
      content.appendChild(video);
    }
  } else {
    const img = document.createElement("img");
    // Check if image is from Google Drive
    if (isGoogleDriveFile(item.src)) {
      img.src = getDriveImageUrl(item.src);
    } else {
      img.src = item.src;
    }
    img.alt = item.title;
    content.appendChild(img);
  }
}

// Generate icon SVG (reusable function for favicon and nav logo)
function generateIconSVG(displayText, bgColor, textColor, size = 100) {
  const fontSize =
    displayText.length === 1
      ? size * 0.7
      : displayText.length === 2
      ? size * 0.55
      : size * 0.45;

  return `
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}">
            <rect width="${size}" height="${size}" fill="${bgColor}" rx="${
    size * 0.1
  }"/>
            <text x="${size / 2}" y="${
    size / 2
  }" font-family="Arial, sans-serif" font-size="${fontSize}" font-weight="bold" fill="${textColor}" text-anchor="middle" dominant-baseline="central" dy="0.1em">${displayText}</text>
        </svg>
    `;
}

// Generate favicon SVG
function generateFavicon() {
  const faviconConfig =
    config.texts && config.texts.favicon
      ? config.texts.favicon
      : {
          useIcon: false,
          iconType: "text",
          icon: "bx bx-camera",
          text: "N",
          backgroundColor: "#000000",
          textColor: "#ffffff",
        };

  if (!faviconConfig.useIcon) {
    return;
  }

  const bgColor = faviconConfig.backgroundColor || "#000000";
  const textColor = faviconConfig.textColor || "#ffffff";
  const displayText = faviconConfig.text || "N";
  const svgContent = generateIconSVG(displayText, bgColor, textColor, 100);

  if (svgContent) {
    // Create blob URL for SVG
    const blob = new Blob([svgContent], { type: "image/svg+xml" });
    const url = URL.createObjectURL(blob);

    // Remove existing favicon links
    const existingFavicons = document.querySelectorAll(
      'link[rel="icon"], link[rel="shortcut icon"]'
    );
    existingFavicons.forEach((link) => link.remove());

    // Create new favicon link
    const link = document.createElement("link");
    link.id = "favicon";
    link.rel = "icon";
    link.href = url;
    link.type = "image/svg+xml";
    document.head.appendChild(link);

    // Also add apple-touch-icon for better mobile support
    const appleLink = document.createElement("link");
    appleLink.rel = "apple-touch-icon";
    appleLink.href = url;
    document.head.appendChild(appleLink);
  }
}

// Generate nav logo icon
function generateNavLogoIcon() {
  const faviconConfig =
    config.texts && config.texts.favicon
      ? config.texts.favicon
      : {
          useIcon: false,
          iconType: "text",
          icon: "bx bx-camera",
          text: "N",
          backgroundColor: "#000000",
          textColor: "#ffffff",
        };

  const logoIcon = document.getElementById("logoIcon");
  if (!logoIcon) return;

  if (!faviconConfig.useIcon) {
    logoIcon.style.display = "none";
    return;
  }

  const bgColor = faviconConfig.backgroundColor || "#000000";
  const textColor = faviconConfig.textColor || "#ffffff";
  const displayText = faviconConfig.text || "N";

  // Generate smaller icon for nav (40x40)
  const svgContent = generateIconSVG(displayText, bgColor, textColor, 40);

  if (svgContent) {
    // Create blob URL for SVG
    const blob = new Blob([svgContent], { type: "image/svg+xml" });
    const url = URL.createObjectURL(blob);

    // Create img element
    const img = document.createElement("img");
    img.src = url;
    img.alt = displayText;
    img.className = "logo-icon-img";

    // Clear and add icon
    logoIcon.innerHTML = "";
    logoIcon.appendChild(img);
  }
}

// Footer setup
function setupFooter() {
  document.getElementById("currentYear").textContent = new Date().getFullYear();
}

// WhatsApp setup
function setupWhatsApp() {
  const waFloatBtn = document.getElementById("waFloatBtn");
  const waChatModal = document.getElementById("waChatModal");
  const waChatClose = document.getElementById("waChatClose");
  const waChatSend = document.getElementById("waChatSend");
  const waChatInput = document.getElementById("waChatInput");
  const waChatMessages = document.getElementById("waChatMessages");
  const waChatName = document.getElementById("waChatName");
  const waChatAvatar = document.getElementById("waChatAvatar");

  // Set profile info (use WhatsApp name if available, otherwise use main profile name)
  const whatsappName =
    config.texts &&
    config.texts.whatsapp &&
    config.texts.whatsapp.name &&
    config.texts.whatsapp.name.trim() !== ""
      ? config.texts.whatsapp.name
      : config.profile.name;

  if (whatsappName) {
    waChatName.textContent = whatsappName;
  }

  // Set WhatsApp status
  const waStatus = document.getElementById("waStatus");
  if (
    waStatus &&
    config.texts &&
    config.texts.whatsapp &&
    config.texts.whatsapp.status
  ) {
    waStatus.textContent = config.texts.whatsapp.status;
  }

  // Set WhatsApp greeting
  const waGreeting = document.getElementById("waGreeting");
  if (
    waGreeting &&
    config.texts &&
    config.texts.whatsapp &&
    config.texts.whatsapp.greeting
  ) {
    waGreeting.textContent = config.texts.whatsapp.greeting;
  }

  // Set WhatsApp input placeholder
  if (
    config.texts &&
    config.texts.whatsapp &&
    config.texts.whatsapp.placeholder
  ) {
    waChatInput.placeholder = config.texts.whatsapp.placeholder;
  }

  // Set avatar (use WhatsApp photo if available, otherwise use main profile photo)
  const whatsappPhoto =
    config.texts &&
    config.texts.whatsapp &&
    config.texts.whatsapp.photo &&
    config.texts.whatsapp.photo.trim() !== ""
      ? config.texts.whatsapp.photo
      : config.profile.photo;

  if (whatsappPhoto) {
    // Clear existing avatar content
    waChatAvatar.innerHTML = "";

    const img = document.createElement("img");
    // Check if photo is from Google Drive
    if (isGoogleDriveFile(whatsappPhoto)) {
      img.src = getDriveImageUrl(whatsappPhoto);
      // Add error handler in case direct link doesn't work
      img.onerror = function () {
        // Fallback: try uc?export=view format
        const match = whatsappPhoto.match(/\/d\/([a-zA-Z0-9_-]+)/);
        if (match) {
          this.src = `https://drive.google.com/uc?export=view&id=${match[1]}`;
        }
      };
    } else {
      img.src = whatsappPhoto;
    }
    img.alt = config.profile.name;
    waChatAvatar.appendChild(img);
  }

  // Open chat modal
  waFloatBtn.addEventListener("click", () => {
    waChatModal.classList.add("active");
    waChatInput.focus();
  });

  // Close chat modal
  waChatClose.addEventListener("click", () => {
    waChatModal.classList.remove("active");
  });

  // Close on outside click
  waChatModal.addEventListener("click", (e) => {
    if (e.target === waChatModal) {
      waChatModal.classList.remove("active");
    }
  });

  // Send message
  function sendMessage() {
    const message = waChatInput.value.trim();
    if (!message) return;

    // Add user message to chat
    const timeLabel =
      config.texts && config.texts.whatsapp && config.texts.whatsapp.timeLabel
        ? config.texts.whatsapp.timeLabel
        : "Sekarang";

    const userMessage = document.createElement("div");
    userMessage.className = "wa-message wa-message-sent";
    userMessage.innerHTML = `
            <div class="wa-message-content">
                <p>${message}</p>
            </div>
            <span class="wa-message-time">${timeLabel}</span>
        `;
    waChatMessages.appendChild(userMessage);

    // Clear input
    waChatInput.value = "";

    // Scroll to bottom
    waChatMessages.scrollTop = waChatMessages.scrollHeight;

    // Redirect to WhatsApp after short delay
    setTimeout(() => {
      const whatsappNumber = config.profile.whatsapp || "6281234567890";
      const encodedMessage = encodeURIComponent(message);
      const waUrl = `https://wa.me/${whatsappNumber}?text=${encodedMessage}`;
      window.open(waUrl, "_blank");

      // Close modal after redirect
      setTimeout(() => {
        waChatModal.classList.remove("active");
      }, 500);
    }, 500);
  }

  // Send on button click
  waChatSend.addEventListener("click", sendMessage);

  // Send on Enter key
  waChatInput.addEventListener("keypress", (e) => {
    if (e.key === "Enter") {
      sendMessage();
    }
  });
}

// Setup scroll animations
function setupScrollAnimations() {
  // Add scroll animation classes to elements
  const sections = document.querySelectorAll("section");
  const galleryItems = document.querySelectorAll(".gallery-item");
  const sectionTitles = document.querySelectorAll(".section-title");
  const aboutDetails = document.querySelectorAll(".about-detail-item");
  const contactItems = document.querySelectorAll(".contact-item");

  // Add animation classes
  sections.forEach((section, index) => {
    if (index > 0) {
      // Skip hero section
      section.classList.add("scroll-fade-in");
    }
  });

  galleryItems.forEach((item) => {
    item.classList.add("scroll-fade-in");
  });

  sectionTitles.forEach((title) => {
    title.classList.add("scroll-fade-in");
  });

  aboutDetails.forEach((detail, index) => {
    detail.classList.add(
      index % 2 === 0 ? "scroll-slide-left" : "scroll-slide-right"
    );
  });

  contactItems.forEach((item, index) => {
    item.classList.add(
      index % 2 === 0 ? "scroll-slide-left" : "scroll-slide-right"
    );
  });

  // Intersection Observer for scroll animations
  const observerOptions = {
    threshold: 0.1,
    rootMargin: "0px 0px -50px 0px",
  };

  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add("visible");
        // Unobserve after animation to prevent re-triggering
        observer.unobserve(entry.target);
      }
    });
  }, observerOptions);

  // Observe all elements with scroll animation classes
  const animatedElements = document.querySelectorAll(
    ".scroll-fade-in, .scroll-slide-left, .scroll-slide-right"
  );
  animatedElements.forEach((el) => observer.observe(el));
}

// Initialize on page load
document.addEventListener("DOMContentLoaded", loadConfig);
