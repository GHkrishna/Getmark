document.addEventListener('DOMContentLoaded', () => {
  const elements = {
    saveNoteButton: document.getElementById('save-note'),
    myDashboardButton: document.getElementById('my-dashboard'),
    tagsContainer: document.getElementById('tags-container'),
    customTagInput: document.getElementById('custom-tag'),
    addCustomTagButton: document.getElementById('add-custom-tag'),
    pageNotesList: document.getElementById('page-notes-list'),
    domainNotesList: document.getElementById('domain-notes-list'),
    searchPageNotesInput: document.getElementById('search-page-notes'),
    tabCreateNote: document.getElementById('tab-create-note'),
    tabMyNotes: document.getElementById('tab-my-notes'),
    createNoteSection: document.getElementById('create-note-section'),
    myNotesSection: document.getElementById('my-notes-section'),
    switchToDomainNotesButton: document.getElementById('switch-to-domain-notes'),
    successMessage: document.getElementById('success-message'),
    goToMyNotesButton: document.getElementById('go-to-my-notes'),
    tagsErrorMessage: document.getElementById('tags-error-message'),
    suggestedTag: document.getElementById('suggested-tag'),
    noteTextarea: document.getElementById('note-textarea')
  };

  const topTags = ['JavaScript', 'System Design', 'GitHub', 'Anime', 'Memes'];
  let allTags = [...topTags];
  let selectedTags = new Set();

  chrome.storage.sync.get(['customTags'], (result) => {
    if (result.customTags) {
      allTags = [...new Set([...allTags, ...result.customTags])];
    }
    renderTags();
  });

  function createTagElement(tag) {
    const tagElement = document.createElement('div');
    tagElement.classList.add('tag');
    tagElement.textContent = tag;

    updateTagVisual(tagElement, selectedTags.has(tag));

    tagElement.addEventListener('click', () => {
      if (selectedTags.has(tag)) {
        selectedTags.delete(tag);
      } else {
        selectedTags.add(tag);
      }
      updateTagVisual(tagElement, selectedTags.has(tag));
    });

    return tagElement;
  }

  function updateTagVisual(element, isSelected) {
    element.dataset.selected = isSelected ? 'true' : 'false';
    element.style.backgroundColor = isSelected ? '#007bff' : '#f0f0f0';
    element.style.color = isSelected ? '#ffffff' : '#000000';
  }

  function renderTags(filtered = null) {
    const tagsToRender = filtered ?? allTags;
    elements.tagsContainer.innerHTML = '';

    if (tagsToRender.length === 0) {
      elements.tagsErrorMessage.classList.remove('hidden');
      elements.suggestedTag.textContent = elements.customTagInput.value.trim();
      return;
    } else {
      elements.tagsErrorMessage.classList.add('hidden');
    }

    tagsToRender.forEach(tag => {
      const tagElement = createTagElement(tag);
      elements.tagsContainer.appendChild(tagElement);
    });
  }

  elements.customTagInput.addEventListener('input', async () => {
    const query = elements.customTagInput.value.toLowerCase().trim();

    if (!query) {
      renderTags();
      return;
    }

    await new Promise(resolve => setTimeout(resolve, 300));

    const filteredTags = allTags.filter(tag => tag.toLowerCase().includes(query));
    renderTags(filteredTags);
  });

  elements.addCustomTagButton.addEventListener('click', () => {
    const customTag = elements.customTagInput.value.trim();
    if (!customTag) return;

    renderTags(); 

    if (!allTags.includes(customTag)) {
      allTags.push(customTag);
      chrome.storage.sync.get(['customTags'], (result) => {
        const customTags = result.customTags || [];
        customTags.push(customTag);
        chrome.storage.sync.set({ customTags });
      });
    }

    selectedTags.add(customTag);
    renderTags();
    elements.customTagInput.value = '';
  });

  elements.saveNoteButton.addEventListener('click', () => {
    const noteText = elements.noteTextarea.value.trim();
    if (!noteText) {
      alert("Note cannot be empty!");
      return;
    }

    const selectedTagsArray = Array.from(selectedTags);

    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const tab = tabs[0];
      const url = new URL(tab.url);
      const domain = url.hostname;

      const note = {
        note: noteText,
        tags: selectedTagsArray,
        time: Date.now(),
        url: tab.url
      };

      chrome.storage.sync.get([url.href, domain], (result) => {
        const pageNotes = result[url.href]?.notes || [];
        const domainNotes = result[domain]?.notes || [];

        pageNotes.push(note);

        if (!domainNotes.some(existingNote => existingNote.url === note.url && existingNote.note === note.note)) {
          domainNotes.push(note);
        }

        chrome.storage.sync.set({
          [url.href]: { notes: pageNotes },
          [domain]: { notes: domainNotes }
        }, () => {
          renderNotes(url.href, elements.pageNotesList);

          showSuccessMessage();
        });
      });
    });

    elements.noteTextarea.value = '';
    elements.customTagInput.value = '';
    selectedTags.clear();
    renderTags();
  });

  function showSuccessMessage() {
    elements.successMessage.classList.remove('hidden');
    setTimeout(() => {
      elements.successMessage.classList.add('hidden');
    }, 3000);
  }

  elements.goToMyNotesButton.addEventListener('click', () => {
    switchTab('my-notes');
  });

  elements.myDashboardButton.addEventListener('click', () => {
    chrome.tabs.create({ url: chrome.runtime.getURL('dashboard.html') });
  });

  elements.tabCreateNote.addEventListener('click', () => switchTab('create-note'));
  elements.tabMyNotes.addEventListener('click', () => switchTab('my-notes'));

  function switchTab(tab) {
    const isCreate = tab === 'create-note';

    elements.tabCreateNote.classList.toggle('active', isCreate);
    elements.tabMyNotes.classList.toggle('active', !isCreate);
    elements.createNoteSection.classList.toggle('hidden', !isCreate);
    elements.myNotesSection.classList.toggle('hidden', isCreate);

    if (!isCreate) {
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        const url = new URL(tabs[0].url);
        renderNotes(url.href, elements.pageNotesList);
      });
    }
  }

  elements.switchToDomainNotesButton.addEventListener('click', () => {
    const isPageNotesHidden = elements.pageNotesList.classList.toggle('hidden');
    elements.domainNotesList.classList.toggle('hidden', !isPageNotesHidden);

    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const url = new URL(tabs[0].url);
      if (isPageNotesHidden) {
        elements.switchToDomainNotesButton.textContent = 'View notes from current page';
        renderNotes(url.hostname, elements.domainNotesList);
      } else {
        elements.switchToDomainNotesButton.textContent = 'View all notes from this website';
        renderNotes(url.href, elements.pageNotesList);
      }
    });
  });

  elements.searchPageNotesInput.addEventListener('input', () => {
    const query = elements.searchPageNotesInput.value.toLowerCase();
    Array.from(elements.pageNotesList.children).forEach(note => {
      note.style.display = note.textContent.toLowerCase().includes(query) ? '' : 'none';
    });
  });

  function renderNotes(key, container) {
    chrome.storage.sync.get([key], (result) => {
      const notes = result[key]?.notes || [];
      container.innerHTML = '';

      notes.forEach(note => {
        const noteElement = document.createElement('div');
        noteElement.classList.add('note');

        const tagsContainer = document.createElement('div');
        tagsContainer.classList.add('note-tags');
        note.tags.forEach(tag => {
          const tagEl = document.createElement('span');
          tagEl.classList.add('tag');
          tagEl.textContent = tag;
          tagsContainer.appendChild(tagEl);
        });

        const noteText = document.createElement('p');
        noteText.textContent = note.note;

        const timestamp = document.createElement('small');
        timestamp.textContent = new Date(note.time).toLocaleString();

        noteElement.append(tagsContainer, noteText, timestamp);
        container.appendChild(noteElement);
      });
    });
  }

  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    const url = new URL(tabs[0].url);
    renderNotes(url.href, elements.pageNotesList);
  });

});
