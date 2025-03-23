document.addEventListener('DOMContentLoaded', () => {
  const searchNotesInput = document.getElementById('search-notes');
  const searchUrlInput = document.getElementById('search-url');
  const sortNotesSelect = document.getElementById('sort-notes');
  const tagsContainer = document.getElementById('tags-container');
  const notesContainer = document.getElementById('notes-container');

  const topTags = ['JavaScript', 'System Design', 'GitHub', 'Anime', 'Memes'];
  let allTags = [...topTags];
  let selectedTags = new Set();

  // Load custom tags from storage
  chrome.storage.sync.get(['customTags'], (result) => {
    if (result.customTags) {
      allTags = [...new Set([...allTags, ...result.customTags])];
    }
    loadTags();
  });

  // Create a tag element and add to the container
  function createTagElement(tag, container) {
    const tagElement = document.createElement('div');
    tagElement.classList.add('tag');
    tagElement.textContent = tag;
    tagElement.dataset.selected = 'false';
    tagElement.style.backgroundColor = '#f0f0f0';
    tagElement.style.color = '#000000';
    tagElement.addEventListener('click', () => {
      const isSelected = tagElement.dataset.selected === 'true';
      tagElement.dataset.selected = isSelected ? 'false' : 'true';
      tagElement.style.backgroundColor = isSelected ? '#f0f0f0' : '#007bff';
      tagElement.style.color = isSelected ? '#000000' : '#ffffff';
      if (isSelected) {
        selectedTags.delete(tag);
      } else {
        selectedTags.add(tag);
      }
      loadFilteredNotes();
    });
    container.appendChild(tagElement);
  }

  // Load all tags into the tags container
  function loadTags() {
    tagsContainer.innerHTML = '';
    allTags.forEach(tag => createTagElement(tag, tagsContainer));
  }

  // Load notes based on selected filters
  function loadFilteredNotes() {
    const query = searchNotesInput.value.toLowerCase();
    const urlQuery = searchUrlInput.value.toLowerCase();
    notesContainer.innerHTML = '';
    chrome.storage.sync.get(null, (items) => {
    // This avoids duplication and also shows complete url instead of domain only
    const notesMap = new Map();

for (const [url, data] of Object.entries(items)) {
  (data.notes || []).forEach(note => {
    // Create a composite key for uniqueness based on URL and note content
    const noteKey = `${note.note}`;

    if (!notesMap.has(noteKey)) {
      notesMap.set(noteKey, { ...note, url });
    } else {
      const existingNote = notesMap.get(noteKey);

      // Check if the new URL is more specific (longer) than the existing URL
      if (note.url.length > existingNote.url.length) {
        notesMap.set(noteKey, { ...note, url });
      }
    }
  });
}

      const notes = Array.from(notesMap.values());
      const filteredNotes = notes.filter(note => {
        const matchesQuery = note.note.toLowerCase().includes(query);
        const matchesUrl = note.url.toLowerCase().includes(urlQuery);
        const matchesTags = Array.from(selectedTags).every(tag => note.tags.includes(tag));
        return matchesQuery && matchesUrl && matchesTags;
      });

      const sortValue = sortNotesSelect.value;
      if (sortValue === 'time-asc') {
        filteredNotes.sort((a, b) => a.time - b.time);
      } else if (sortValue === 'time-desc') {
        filteredNotes.sort((a, b) => b.time - a.time);
      } else if (sortValue === 'alphabetical-asc') {
        filteredNotes.sort((a, b) => a.note.localeCompare(b.note));
      } else if (sortValue === 'alphabetical-desc') {
        filteredNotes.sort((a, b) => b.note.localeCompare(a.note));
      }

      filteredNotes.forEach(noteData => {
        console.log('this is noteData', noteData)
        const noteElement = document.createElement('div');
        noteElement.classList.add('note-card');
        noteElement.innerHTML = `
          <div class="note-header">
            <h3 class="note-url"> <a href = "${noteData.url}"> ${noteData.url} </a></h3>
            <button class="delete-note-button"><i class="fas fa-trash-alt"></i></button>
          </div>
          <p class="note-text">${noteData.note}</p>
          <div class="note-tags">${noteData.tags.map(tag => `<span class="note-tag">${tag}</span>`).join('')}</div>
          <p class="note-time"><small>${new Date(noteData.time).toLocaleString()}</small></p>
        `;
        noteElement.querySelector('.delete-note-button').addEventListener('click', () => {
          deleteNoteFromStorage(noteData.url, noteData.note);
        });
        notesContainer.appendChild(noteElement);
      });
    });
  }

  // Delete a note from storage
  function deleteNoteFromStorage(url, noteText) {
    chrome.storage.sync.get([url], (result) => {
      if (result[url]) {
        const notes = result[url].notes.filter(note => note.note !== noteText);
        if (notes.length > 0) {
          chrome.storage.sync.set({ [url]: { notes } }, loadFilteredNotes);
        } else {
          chrome.storage.sync.remove(url, loadFilteredNotes);
        }
      }
    });
  }

  searchNotesInput.addEventListener('input', loadFilteredNotes);
  searchUrlInput.addEventListener('input', loadFilteredNotes);
  sortNotesSelect.addEventListener('change', loadFilteredNotes);

  loadFilteredNotes();
});
