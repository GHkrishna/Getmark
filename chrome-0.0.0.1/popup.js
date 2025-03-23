document.addEventListener('DOMContentLoaded', () => {
  const saveNoteButton = document.getElementById('save-note');
  const myDashboardButton = document.getElementById('my-dashboard');
  const searchTagInput = document.getElementById('search-tag');
  const tagsContainer = document.getElementById('tags-container');
  const customTagInput = document.getElementById('custom-tag');
  const addCustomTagButton = document.getElementById('add-custom-tag');
  const pageNotesList = document.getElementById('page-notes-list');
  const domainNotesList = document.getElementById('domain-notes-list');
  const searchPageNotesInput = document.getElementById('search-page-notes');
  const tabCreateNote = document.getElementById('tab-create-note');
  const tabMyNotes = document.getElementById('tab-my-notes');
  const createNoteSection = document.getElementById('create-note-section');
  const myNotesSection = document.getElementById('my-notes-section');
  const switchToDomainNotesButton = document.getElementById('switch-to-domain-notes');
  const successMessage = document.getElementById('success-message');
  const goToMyNotesButton = document.getElementById('go-to-my-notes');

  const topTags = ['JavaScript', 'System Design', 'GitHub', 'Anime', 'Memes'];
  let allTags = [...topTags];

  // Load custom tags from storage
  chrome.storage.sync.get(['customTags'], (result) => {
    if (result.customTags) {
      allTags = [...new Set([...allTags, ...result.customTags])];
    }
    loadTags();
  });

  // Create a tag element and add to the container
  function createTagElement(tag, container, isSelected = false) {
    const tagElement = document.createElement('div');
    tagElement.classList.add('tag');
    tagElement.textContent = tag;
    tagElement.dataset.selected = isSelected ? 'true' : 'false';
    tagElement.style.backgroundColor = isSelected ? '#007bff' : '#f0f0f0';
    tagElement.style.color = isSelected ? '#ffffff' : '#000000';
    tagElement.addEventListener('click', () => {
      const isSelected = tagElement.dataset.selected === 'true';
      tagElement.dataset.selected = isSelected ? 'false' : 'true';
      tagElement.style.backgroundColor = isSelected ? '#f0f0f0' : '#007bff';
      tagElement.style.color = isSelected ? '#000000' : '#ffffff';
    });
    container.appendChild(tagElement);
  }

  // Load all tags into the tags container
  function loadTags() {
    tagsContainer.innerHTML = '';
    allTags.forEach(tag => createTagElement(tag, tagsContainer));
  }

  // Add a custom tag and update storage
  addCustomTagButton.addEventListener('click', () => {
    const customTag = customTagInput.value.trim();
    if (customTag) {
      const existingTagElement = Array.from(tagsContainer.children).find(tagElement => tagElement.textContent === customTag);
      if (existingTagElement) {
        existingTagElement.dataset.selected = 'true';
        existingTagElement.style.backgroundColor = '#007bff';
        existingTagElement.style.color = '#ffffff';
      } else {
        allTags.push(customTag);
        chrome.storage.sync.get(['customTags'], (result) => {
          const customTags = result.customTags || [];
          customTags.push(customTag);
          chrome.storage.sync.set({ customTags });
        });
        createTagElement(customTag, tagsContainer, true);
      }
      customTagInput.value = '';
    }
  });

  // Save note functionality
  saveNoteButton.addEventListener('click', () => {
    const noteText = document.querySelector('textarea').value.trim();
    if (!noteText) {
      alert("Note cannot be empty!");
      return;
    }

    const selectedTags = Array.from(document.querySelectorAll('.tag[data-selected="true"]')).map(tag => tag.textContent);

    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const tab = tabs[0];
      const url = new URL(tab.url);
      const domain = url.hostname;

      const note = {
        note: noteText,
        tags: selectedTags,
        time: Date.now(),
        url: tab.url
      };

      chrome.storage.sync.get([url.href, domain], (result) => {
        const pageNotes = result[url.href] ? result[url.href].notes : [];
        const domainNotes = result[domain] ? result[domain].notes : [];

        pageNotes.push(note);

        if (!domainNotes.some(existingNote => existingNote.url === note.url && existingNote.note === note.note)) {
          domainNotes.push(note);
        }

        chrome.storage.sync.set({
          [url.href]: { notes: pageNotes },
          [domain]: { notes: domainNotes }
        }, () => {
          loadNotes(url.href, pageNotesList);
          showSuccessMessage();
        });
      });
    });

    document.querySelector('textarea').value = '';
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const url = new URL(tabs[0].url);
      loadNotes(url.href, pageNotesList);
    });

    // Deselect tags after saving the note
    Array.from(document.querySelectorAll('.tag[data-selected="true"]')).forEach(tagElement => {
      tagElement.dataset.selected = 'false';
      tagElement.style.backgroundColor = '#f0f0f0';
      tagElement.style.color = '#000000';
    });
  });

  // Show success message
  function showSuccessMessage() {
    successMessage.classList.remove('hidden');
    setTimeout(() => {
      successMessage.classList.add('hidden');
    }, 3000);
  }

  // Navigate to My Notes tab
  goToMyNotesButton.addEventListener('click', () => {
    tabCreateNote.classList.remove('active');
    tabMyNotes.classList.add('active');
    createNoteSection.classList.add('hidden');
    myNotesSection.classList.remove('hidden');
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const url = new URL(tabs[0].url);
      loadNotes(url.href, pageNotesList);
    });
  });

  // Open the dashboard
  myDashboardButton.addEventListener('click', () => {
    chrome.tabs.create({ url: chrome.runtime.getURL('dashboard.html') });
  });

  // Tab switching
  tabCreateNote.addEventListener('click', () => {
    tabCreateNote.classList.add('active');
    tabMyNotes.classList.remove('active');
    createNoteSection.classList.remove('hidden');
    myNotesSection.classList.add('hidden');
  });

  tabMyNotes.addEventListener('click', () => {
    tabCreateNote.classList.remove('active');
    tabMyNotes.classList.add('active');
    createNoteSection.classList.add('hidden');
    myNotesSection.classList.remove('hidden');
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const url = new URL(tabs[0].url);
      loadNotes(url.href, pageNotesList);
    });
  });

  // Switch between page and domain notes
  switchToDomainNotesButton.addEventListener('click', () => {
    pageNotesList.classList.toggle('hidden');
    domainNotesList.classList.toggle('hidden');
    if (pageNotesList.classList.contains('hidden')) {
      switchToDomainNotesButton.textContent = 'View notes from current page';
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        const url = new URL(tabs[0].url);
        loadNotes(url.hostname, domainNotesList);
      });
    } else {
      switchToDomainNotesButton.textContent = 'View all notes from this website';
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        const url = new URL(tabs[0].url);
        loadNotes(url.href, pageNotesList);
      });
    }
  });

  // Search notes within the page
  searchPageNotesInput.addEventListener('input', () => {
    const query = searchPageNotesInput.value.toLowerCase();
    Array.from(pageNotesList.children).forEach(note => {
      note.style.display = note.textContent.toLowerCase().includes(query) ? '' : 'none';
    });
  });

  // Load notes for the active tab
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    const tab = tabs[0];
    const url = new URL(tab.url);
    loadNotes(url.href, pageNotesList);
  });

  // Load notes function
  function loadNotes(key, container) {
    chrome.storage.sync.get([key], (result) => {
      const notes = result[key] ? result[key].notes : [];
      container.innerHTML = '';
      notes.forEach(note => {
        const noteElement = document.createElement('div');
        noteElement.classList.add('note');

        // Top section with tags
        const tagsContainer = document.createElement('div');
        tagsContainer.classList.add('note-tags');
        note.tags.forEach(tag => {
          const tagElement = document.createElement('span');
          tagElement.classList.add('tag');
          tagElement.textContent = tag;
          tagsContainer.appendChild(tagElement);
        });

        // Middle section with note text
        const noteText = document.createElement('p');
        noteText.textContent = note.note;

        // Bottom section with timestamp
        const timestamp = document.createElement('small');
        timestamp.textContent = new Date(note.time).toLocaleString();

        // Append sections to note element
        noteElement.appendChild(tagsContainer);
        noteElement.appendChild(noteText);
        noteElement.appendChild(timestamp);

        container.appendChild(noteElement);
      });
    });
  }
});
