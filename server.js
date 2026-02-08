const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const DATA_DIR = path.join(__dirname, 'data');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Helper functions
const readData = (filename) => {
  const filePath = path.join(DATA_DIR, filename);
  if (!fs.existsSync(filePath)) {
    return {};
  }
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
};

const writeData = (filename, data) => {
  const filePath = path.join(DATA_DIR, filename);
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
};

const generateId = () => {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
};

// Initialize data files if they don't exist
const initializeData = () => {
  const files = ['travel.json', 'local.json', 'events.json', 'experiences.json', 'media.json', 'discoveries.json', 'state.json', 'meta.json'];
  
  files.forEach(file => {
    const filePath = path.join(DATA_DIR, file);
    if (!fs.existsSync(filePath)) {
      const defaultData = file === 'state.json' ? {
        lastHeartbeat: new Date().toISOString(),
        lastMorningBrief: null,
        lastEveningBrief: null,
        lastLearningCycle: null,
        totalHeartbeats: 0,
        currentFocus: "Seeding dashboard with real data",
        nextPriority: "Research Burlington restaurants and events",
        queuedForMorning: null,
        dataFreshness: {},
        knownPreferences: {
          food: ["carnivore-friendly", "quality meat", "burgers", "steak"],
          travel: ["cultural experiences", "food-focused trips", "solo-friendly"],
          activities: ["outdoors", "local hidden gems"],
          avoids: ["beach resorts", "all-inclusive", "chain restaurants"]
        },
        discoveriesThatLanded: [],
        discoveriesThatFlopped: [],
        lessonsLearned: []
      } : {};
      writeData(file, defaultData);
    }
  });
};

initializeData();

// === GET Routes ===

app.get('/api/travel', (req, res) => {
  res.json(readData('travel.json'));
});

app.get('/api/local', (req, res) => {
  res.json(readData('local.json'));
});

app.get('/api/events', (req, res) => {
  res.json(readData('events.json'));
});

app.get('/api/experiences', (req, res) => {
  res.json(readData('experiences.json'));
});

app.get('/api/media', (req, res) => {
  res.json(readData('media.json'));
});

app.get('/api/discoveries', (req, res) => {
  res.json(readData('discoveries.json'));
});

app.get('/api/state', (req, res) => {
  res.json(readData('state.json'));
});

app.get('/api/meta', (req, res) => {
  res.json(readData('meta.json'));
});

// === POST Routes ===

app.post('/api/travel', (req, res) => {
  const data = readData('travel.json');
  if (!data.destinations) data.destinations = [];
  
  const newDest = { id: generateId(), ...req.body, addedAt: new Date().toISOString() };
  data.destinations.push(newDest);
  
  writeData('travel.json', data);
  res.json({ success: true, id: newDest.id });
});

app.post('/api/local', (req, res) => {
  const data = readData('local.json');
  if (!data.places) data.places = [];
  
  const newPlace = { id: generateId(), ...req.body, addedAt: new Date().toISOString() };
  data.places.push(newPlace);
  
  writeData('local.json', data);
  res.json({ success: true, id: newPlace.id });
});

app.post('/api/events', (req, res) => {
  const data = readData('events.json');
  if (!data.events) data.events = [];
  
  const newEvent = { id: generateId(), ...req.body, addedAt: new Date().toISOString() };
  data.events.push(newEvent);
  
  writeData('events.json', data);
  res.json({ success: true, id: newEvent.id });
});

app.post('/api/experiences', (req, res) => {
  const data = readData('experiences.json');
  if (!data.experiences) data.experiences = [];
  
  const newExp = { id: generateId(), ...req.body, addedAt: new Date().toISOString() };
  data.experiences.push(newExp);
  
  writeData('experiences.json', data);
  res.json({ success: true, id: newExp.id });
});

app.post('/api/media', (req, res) => {
  const data = readData('media.json');
  if (!data.items) data.items = [];
  
  const newItem = { id: generateId(), ...req.body, addedAt: new Date().toISOString() };
  data.items.push(newItem);
  
  writeData('media.json', data);
  res.json({ success: true, id: newItem.id });
});

app.post('/api/discoveries', (req, res) => {
  const data = readData('discoveries.json');
  if (!data.discoveries) data.discoveries = [];
  
  const newDisc = { id: generateId(), ...req.body, addedAt: new Date().toISOString() };
  data.discoveries.push(newDisc);
  
  writeData('discoveries.json', data);
  res.json({ success: true, id: newDisc.id });
});

app.post('/api/state', (req, res) => {
  const data = readData('state.json');
  Object.assign(data, req.body);
  writeData('state.json', data);
  res.json({ success: true });
});

// === PATCH Routes ===

app.patch('/api/travel/:id', (req, res) => {
  const data = readData('travel.json');
  const dest = data.destinations?.find(d => d.id === req.params.id);
  if (dest) {
    Object.assign(dest, req.body);
    writeData('travel.json', data);
    res.json({ success: true });
  } else {
    res.status(404).json({ error: 'Not found' });
  }
});

app.patch('/api/local/:id', (req, res) => {
  const data = readData('local.json');
  const place = data.places?.find(p => p.id === req.params.id);
  if (place) {
    Object.assign(place, req.body);
    writeData('local.json', data);
    res.json({ success: true });
  } else {
    res.status(404).json({ error: 'Not found' });
  }
});

app.patch('/api/experiences/:id', (req, res) => {
  const data = readData('experiences.json');
  const exp = data.experiences?.find(e => e.id === req.params.id);
  if (exp) {
    Object.assign(exp, req.body);
    writeData('experiences.json', data);
    res.json({ success: true });
  } else {
    res.status(404).json({ error: 'Not found' });
  }
});

app.patch('/api/events/:id', (req, res) => {
  const data = readData('events.json');
  const event = data.events?.find(e => e.id === req.params.id);
  if (event) {
    Object.assign(event, req.body);
    writeData('events.json', data);
    res.json({ success: true });
  } else {
    res.status(404).json({ error: 'Not found' });
  }
});

app.patch('/api/media/:id', (req, res) => {
  const data = readData('media.json');
  const item = data.items?.find(i => i.id === req.params.id);
  if (item) {
    Object.assign(item, req.body);
    writeData('media.json', data);
    res.json({ success: true });
  } else {
    res.status(404).json({ error: 'Not found' });
  }
});

app.patch('/api/discoveries/:id', (req, res) => {
  const data = readData('discoveries.json');
  const disc = data.discoveries?.find(d => d.id === req.params.id);
  if (disc) {
    Object.assign(disc, req.body);
    writeData('discoveries.json', data);
    res.json({ success: true });
  } else {
    res.status(404).json({ error: 'Not found' });
  }
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Start server
app.listen(PORT, () => {
  console.log(`Joy Dashboard running on port ${PORT}`);
  console.log(`Data directory: ${DATA_DIR}`);
});
