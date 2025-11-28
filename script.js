document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    const uploadZone = document.getElementById('upload-zone');
    const fileInput = document.getElementById('file-input');

    // Check for file protocol
    if (window.location.protocol === 'file:') {
        const warning = document.createElement('div');
        warning.style.cssText = `
            background: #ef4444; color: white; padding: 15px; text-align: center;
            font-weight: bold; position: fixed; top: 0; left: 0; width: 100%; z-index: 2000;
        `;
        warning.innerHTML = `
            ⚠️ API features will NOT work when opening the file directly. 
            <br>Please run a local server (e.g., <code>npx serve .</code>) and open http://localhost:3000
        `;
        document.body.prepend(warning);
        document.querySelector('.app-container').style.marginTop = '60px';
    }

    const browseBtn = document.getElementById('browse-btn');
    const workspace = document.getElementById('workspace');
    const imageList = document.getElementById('image-list');
    const imageCount = document.getElementById('image-count');
    const clearAllBtn = document.getElementById('clear-all-btn');
    const generateBtn = document.getElementById('generate-btn');
    const downloadBtn = document.getElementById('download-btn');

    // Editor Elements
    const titleInput = document.getElementById('title-input');
    const descInput = document.getElementById('desc-input');
    const keywordsInput = document.getElementById('keywords-input');
    const keywordContainer = document.getElementById('keyword-container');
    const suggestionChips = document.getElementById('suggestion-chips');

    // State
    let images = []; // Array of { id, file, url, title, description, keywords[] }
    let selectedImageId = null;

    // --- Event Listeners ---

    // Drag & Drop
    uploadZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        uploadZone.querySelector('.upload-box').classList.add('drag-over');
    });

    uploadZone.addEventListener('dragleave', () => {
        uploadZone.querySelector('.upload-box').classList.remove('drag-over');
    });

    uploadZone.addEventListener('drop', (e) => {
        e.preventDefault();
        uploadZone.querySelector('.upload-box').classList.remove('drag-over');
        handleFiles(e.dataTransfer.files);
    });

    // File Input
    browseBtn.addEventListener('click', () => fileInput.click());
    fileInput.addEventListener('change', (e) => handleFiles(e.target.files));

    // Clear All
    clearAllBtn.addEventListener('click', () => {
        if (confirm('Are you sure you want to clear all images?')) {
            images = [];
            selectedImageId = null;
            renderImageList();
            updateUI();
        }
    });

    // --- Core Functions ---

    function handleFiles(files) {
        const newFiles = Array.from(files).filter(file => file.type.startsWith('image/'));

        if (newFiles.length === 0) return;

        newFiles.forEach(file => {
            const id = Date.now() + Math.random().toString(36).substr(2, 9);
            const url = URL.createObjectURL(file);

            images.push({
                id,
                file,
                url,
                title: '',
                description: '',
                keywords: []
            });
        });

        // Select the first new image if none selected
        if (!selectedImageId && images.length > 0) {
            selectedImageId = images[0].id;
        }

        renderImageList();
        updateUI();
    }

    function updateUI() {
        if (images.length > 0) {
            uploadZone.style.display = 'none';
            workspace.style.display = 'block';
            imageCount.textContent = `${images.length} Images`;
        } else {
            uploadZone.style.display = 'block';
            workspace.style.display = 'none';
        }
    }

    function renderImageList() {
        imageList.innerHTML = '';

        images.forEach(img => {
            const card = document.createElement('div');
            card.className = `image-card ${img.id === selectedImageId ? 'selected' : ''}`;
            card.onclick = () => selectImage(img.id);

            card.innerHTML = `
                <img src="${img.url}" alt="${img.file.name}">
                <div class="image-info">
                    <div class="image-name" title="${img.file.name}">${img.file.name}</div>
                    <div class="status-indicator ${img.title ? 'done' : ''}">
                        ${img.title ? '<i class="fa-solid fa-check"></i> Ready' : 'Pending'}
                    </div>
                </div>
            `;

            imageList.appendChild(card);
        });

        loadEditor(selectedImageId);
    }

    function selectImage(id) {
        selectedImageId = id;
        renderImageList(); // Re-render to update selection highlight
    }

    function loadEditor(id) {
        if (!id) return;

        const img = images.find(i => i.id === id);
        if (!img) return;

        // Populate fields
        titleInput.value = img.title;
        descInput.value = img.description;
        renderKeywords(img.keywords);
        renderSuggestions();
    }

    function renderSuggestions() {
        const commonTags = ['nature', 'business', 'people', 'technology', 'abstract', 'city', 'travel', 'food'];
        // Randomly pick 5
        const shuffled = commonTags.sort(() => 0.5 - Math.random());
        const selected = shuffled.slice(0, 5);

        suggestionChips.innerHTML = selected.map(tag =>
            `<span class="chip" onclick="addKeyword('${selectedImageId}', '${tag}')">+ ${tag}</span>`
        ).join('');

        // Add event listeners to new chips
        suggestionChips.querySelectorAll('.chip').forEach(chip => {
            chip.addEventListener('click', (e) => {
                const tag = e.target.innerText.replace('+ ', '');
                addKeyword(selectedImageId, tag);
            });
        });
    }

    function renderKeywords(keywords) {
        keywordContainer.innerHTML = '';
        keywords.forEach((kw, index) => {
            const tag = document.createElement('div');
            tag.className = 'tag';
            tag.innerHTML = `
                ${kw} 
                <i class="fa-solid fa-xmark" onclick="removeKeyword('${index}')"></i>
            `;
            // Note: removeKeyword needs to be accessible or attached via event listener
            tag.querySelector('i').addEventListener('click', (e) => {
                e.stopPropagation();
                removeKeyword(index);
            });
            keywordContainer.appendChild(tag);
        });
    }

    function removeKeyword(index) {
        const img = images.find(i => i.id === selectedImageId);
        if (img) {
            img.keywords.splice(index, 1);
            renderKeywords(img.keywords);
        }
    }

    // --- Input Handling ---

    titleInput.addEventListener('input', (e) => {
        updateImageData(selectedImageId, { title: e.target.value });
    });

    descInput.addEventListener('input', (e) => {
        updateImageData(selectedImageId, { description: e.target.value });
    });

    keywordsInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            const val = e.target.value.trim();
            if (val) {
                addKeyword(selectedImageId, val);
                e.target.value = '';
            }
        }
    });

    function updateImageData(id, data) {
        const img = images.find(i => i.id === id);
        if (img) {
            Object.assign(img, data);
            // Update UI indicator if title is added/removed
            if (data.hasOwnProperty('title')) {
                renderImageList();
            }
        }
    }

    function addKeyword(id, keyword) {
        const img = images.find(i => i.id === id);
        if (img && !img.keywords.includes(keyword)) {
            img.keywords.push(keyword);
            renderKeywords(img.keywords);
        }
    }

    // --- API Key & Model Handling ---

    let apiKey = localStorage.getItem('gemini_api_key') || '';
    let selectedModel = localStorage.getItem('gemini_model') || 'gemini-1.5-flash';

    const apiModal = document.getElementById('api-modal');
    const apiKeyBtn = document.getElementById('api-key-btn');
    const apiKeyInput = document.getElementById('api-key-input');
    const modelSelect = document.getElementById('model-select');
    const saveApiKeyBtn = document.getElementById('save-api-key-btn');
    const closeModalBtns = document.querySelectorAll('.close-modal, .close-modal-btn');

    const testApiBtn = document.getElementById('test-api-btn');

    if (apiKey) {
        apiKeyInput.value = apiKey;
    }

    if (selectedModel) {
        modelSelect.value = selectedModel;
    }

    apiKeyBtn.addEventListener('click', () => {
        apiModal.style.display = 'flex';
    });

    closeModalBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            apiModal.style.display = 'none';
        });
    });

    window.addEventListener('click', (e) => {
        if (e.target === apiModal) {
            apiModal.style.display = 'none';
        }
    });

    testApiBtn.addEventListener('click', async () => {
        const key = apiKeyInput.value.trim();
        if (!key) {
            alert('Please enter an API key first.');
            return;
        }

        testApiBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Testing...';
        testApiBtn.disabled = true;

        try {
            // Try a simple text generation with 1.5 Flash (most reliable)
            const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${key}`;
            const payload = {
                contents: [{ parts: [{ text: "Say hello" }] }]
            };

            const response = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (response.ok) {
                alert('Success! API Key is working.');
            } else {
                const errorText = await response.text();
                alert(`Connection Failed: ${response.status} - ${errorText}`);
            }
        } catch (error) {
            alert(`Network Error: ${error.message}. (Are you running a local server?)`);
        } finally {
            testApiBtn.innerHTML = 'Test Connection';
            testApiBtn.disabled = false;
        }
    });

    saveApiKeyBtn.addEventListener('click', () => {
        const key = apiKeyInput.value.trim();
        const model = modelSelect.value;

        if (key) {
            apiKey = key;
            selectedModel = model;
            localStorage.setItem('gemini_api_key', key);
            localStorage.setItem('gemini_model', model);
            apiModal.style.display = 'none';
            alert('Settings saved!');
        } else {
            alert('Please enter a valid API key.');
        }
    });

    // --- Gemini AI Generation ---

    generateBtn.addEventListener('click', async () => {
        if (!apiKey) {
            apiModal.style.display = 'flex';
            return;
        }

        const btn = generateBtn;
        const originalText = btn.innerHTML;
        btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Generating...';
        btn.disabled = true;

        try {
            // Process images sequentially to avoid rate limits
            for (const img of images) {
                if (!img.title) { // Only generate if empty
                    try {
                        const result = await callGeminiAPI(img.file, apiKey, selectedModel);
                        if (result) {
                            img.title = result.title;
                            img.description = result.description;
                            img.keywords = result.keywords;
                        }
                    } catch (err) {
                        alert(`Failed to generate for ${img.file.name}: ${err.message}`);
                        break; // Stop on first error to avoid spamming alerts
                    }
                }
            }

            renderImageList();
            if (selectedImageId) {
                loadEditor(selectedImageId);
            }
        } catch (error) {
            console.error('Generation failed:', error);
            alert('An unexpected error occurred.');
        } finally {
            btn.innerHTML = originalText;
            btn.disabled = false;
        }
    });

    async function callGeminiAPI(file, key, model) {
        const base64Image = await fileToBase64(file);
        const cleanBase64 = base64Image.split(',')[1]; // Remove data:image/jpeg;base64, prefix

        const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`;

        const prompt = `
            Analyze this stock photo and generate metadata for it.
            Return ONLY a valid JSON object with the following structure:
            {
                "title": "A concise, commercially viable title (max 10 words)",
                "description": "A detailed description for stock photography sites (max 2 sentences)",
                "keywords": ["keyword1", "keyword2", ..., "keyword15"]
            }
            Do not include markdown formatting like \`\`\`json.
        `;

        const payload = {
            contents: [{
                parts: [
                    { text: prompt },
                    { inline_data: { mime_type: file.type, data: cleanBase64 } }
                ]
            }]
        };

        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (!response.ok) {
                const errorBody = await response.text();
                console.error('API Error Body:', errorBody);
                throw new Error(`API Error ${response.status}: ${errorBody}`);
            }

            const data = await response.json();

            if (!data.candidates || !data.candidates[0] || !data.candidates[0].content) {
                console.error('Unexpected API Response:', data);
                throw new Error('Unexpected response format from Gemini API');
            }

            const text = data.candidates[0].content.parts[0].text;

            // Clean up markdown if present
            const jsonStr = text.replace(/```json/g, '').replace(/```/g, '').trim();
            return JSON.parse(jsonStr);

        } catch (error) {
            console.error('Gemini API Error:', error);
            throw error; // Re-throw to be caught by caller
        }
    }

    function fileToBase64(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = () => resolve(reader.result);
            reader.onerror = error => reject(error);
        });
    }

    /* 
    // Mock Data Function Removed
    function generateMockData(filename) { ... } 
    */

    // --- CSV Export ---

    downloadBtn.addEventListener('click', () => {
        if (images.length === 0) return;

        const csvContent = generateCSV(images);
        downloadCSVFile(csvContent, 'metadata.csv');
    });

    function generateCSV(data) {
        const headers = ['Filename', 'Title', 'Description', 'Keywords'];
        const rows = data.map(img => {
            const row = [
                img.file.name,
                `"${img.title.replace(/"/g, '""')}"`, // Escape quotes
                `"${img.description.replace(/"/g, '""')}"`,
                `"${img.keywords.join(', ')}"`
            ];
            return row.join(',');
        });

        return [headers.join(','), ...rows].join('\n');
    }

    function downloadCSVFile(content, filename) {
        const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        if (link.download !== undefined) {
            const url = URL.createObjectURL(blob);
            link.setAttribute('href', url);
            link.setAttribute('download', filename);
            link.style.visibility = 'hidden';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        }
    }
});
