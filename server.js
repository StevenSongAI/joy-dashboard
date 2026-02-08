const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const https = require('https');

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

// Initialize data files if they don't exist (but don't overwrite existing ones)
const initializeData = () => {
  const files = ['travel.json', 'local.json', 'events.json', 'experiences.json', 'media.json', 'discoveries.json', 'state.json', 'meta.json', 'calendars.json', 'linked-events.json'];
  
  files.forEach(file => {
    const filePath = path.join(DATA_DIR, file);
    if (!fs.existsSync(filePath)) {
      // Only create if file doesn't exist - copy from repo if available
      const repoFilePath = path.join(__dirname, 'data', file);
      if (fs.existsSync(repoFilePath)) {
        // Copy from repo
        fs.copyFileSync(repoFilePath, filePath);
      } else {
        // Create default
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
        } : file === 'calendars.json' ? {
          connected: [],
          lastSync: null
        } : file === 'linked-events.json' ? {
          links: []
        } : {};
        writeData(file, defaultData);
      }
    }
  });
};

initializeData();

// === Calendar Sync Functions ===

// Parse iCal/ICS data
function parseICalData(icalData) {
  const events = [];
  const lines = icalData.split('\n');
  let currentEvent = null;
  
  for (let line of lines) {
    line = line.trim();
    
    if (line === 'BEGIN:VEVENT') {
      currentEvent = {
        uid: '',
        summary: '',
        description: '',
        location: '',
        startDate: null,
        endDate: null,
        source: 'calendar'
      };
    } else if (line === 'END:VEVENT' && currentEvent) {
      if (currentEvent.summary && currentEvent.startDate) {
        events.push(currentEvent);
      }
      currentEvent = null;
    } else if (currentEvent) {
      if (line.startsWith('UID:')) {
        currentEvent.uid = line.substring(4);
      } else if (line.startsWith('SUMMARY:')) {
        currentEvent.summary = line.substring(8).replace(/\\,/g, ',');
      } else if (line.startsWith('DESCRIPTION:')) {
        currentEvent.description = line.substring(12).replace(/\\,/g, ',').replace(/\\n/g, '\n');
      } else if (line.startsWith('LOCATION:')) {
        currentEvent.location = line.substring(9).replace(/\\,/g, ',');
      } else if (line.startsWith('DTSTART')) {
        const dateStr = line.split(':')[1];
        currentEvent.startDate = parseICalDate(dateStr);
      } else if (line.startsWith('DTEND')) {
        const dateStr = line.split(':')[1];
        currentEvent.endDate = parseICalDate(dateStr);
      }
    }
  }
  
  return events;
}

function parseICalDate(dateStr) {
  if (!dateStr) return null;
  // Handle both date-only (20240208) and datetime (20240208T120000Z) formats
  if (dateStr.includes('T')) {
    const year = dateStr.substring(0, 4);
    const month = dateStr.substring(4, 6);
    const day = dateStr.substring(6, 8);
    const hour = dateStr.substring(9, 11);
    const minute = dateStr.substring(11, 13);
    return new Date(`${year}-${month}-${day}T${hour}:${minute}:00`).toISOString();
  } else {
    const year = dateStr.substring(0, 4);
    const month = dateStr.substring(4, 6);
    const day = dateStr.substring(6, 8);
    return `${year}-${month}-${day}`;
  }
}

// Fetch calendar from URL
async function fetchCalendar(url) {
  return new Promise((resolve, reject) => {
    const client = url.startsWith('https') ? https : require('http');
    const req = client.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(data));
    });
    req.on('error', reject);
    req.setTimeout(30000, () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });
  });
}

// Find potential links between calendar events and dashboard items
function findPotentialLinks(event, dashboardData) {
  const links = [];
  const eventName = event.summary.toLowerCase();
  const eventLoc = event.location.toLowerCase();
  
  // Check travel destinations
  const travel = dashboardData.travel || {};
  (travel.destinations || []).forEach(dest => {
    if (eventName.includes(dest.name.toLowerCase().split(' ')[0])) {
      links.push({ type: 'travel', id: dest.id, name: dest.name });
    }
  });
  
  // Check local places
  const local = dashboardData.local || {};
  (local.places || []).forEach(place => {
    if (eventLoc.includes(place.name.toLowerCase()) || 
        eventName.includes(place.name.toLowerCase())) {
      links.push({ type: 'local', id: place.id, name: place.name });
    }
  });
  
  // Check experiences
  const experiences = dashboardData.experiences || {};
  (experiences.experiences || []).forEach(exp => {
    if (eventName.includes(exp.title.toLowerCase().split(' ').slice(0, 3).join(' '))) {
      links.push({ type: 'experience', id: exp.id, name: exp.title });
    }
  });
  
  return links;
}

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

// === Calendar Routes ===

// Get connected calendars
app.get('/api/calendars', (req, res) => {
  res.json(readData('calendars.json'));
});

// Get linked events
app.get('/api/linked-events', (req, res) => {
  res.json(readData('linked-events.json'));
});

// Get calendar events (merged from all connected calendars)
app.get('/api/calendar-events', async (req, res) => {
  try {
    const calendars = readData('calendars.json');
    console.log('Fetching calendar events. Connected calendars:', calendars.connected?.length || 0);
    
    const allEvents = [];
    const errors = [];
    
    for (const cal of calendars.connected || []) {
      try {
        console.log(`Fetching calendar: ${cal.name} from ${cal.url.substring(0, 50)}...`);
        const icalData = await fetchCalendar(cal.url);
        console.log(`Got ${icalData.length} bytes of iCal data for ${cal.name}`);
        
        const events = parseICalData(icalData);
        console.log(`Parsed ${events.length} events from ${cal.name}`);
        
        events.forEach(e => {
          e.calendarName = cal.name;
          e.calendarId = cal.id;
        });
        allEvents.push(...events);
      } catch (err) {
        console.error(`Failed to fetch calendar ${cal.name}:`, err.message);
        errors.push({ calendar: cal.name, error: err.message });
      }
    }
    
    // Sort by start date
    allEvents.sort((a, b) => new Date(a.startDate) - new Date(b.startDate));
    
    console.log(`Returning ${allEvents.length} total events`);
    
    res.json({
      events: allEvents,
      lastSync: calendars.lastSync,
      count: allEvents.length,
      errors: errors.length > 0 ? errors : undefined
    });
  } catch (err) {
    console.error('Calendar events error:', err);
    res.status(500).json({ error: err.message });
  }
});

// Sync calendars now
app.post('/api/calendars/sync', async (req, res) => {
  try {
    const calendars = readData('calendars.json');
    const dashboardData = {
      travel: readData('travel.json'),
      local: readData('local.json'),
      experiences: readData('experiences.json')
    };
    const linkedEvents = readData('linked-events.json');
    
    let totalEvents = 0;
    const newLinks = [];
    
    for (const cal of calendars.connected || []) {
      try {
        const icalData = await fetchCalendar(cal.url);
        const events = parseICalData(icalData);
        totalEvents += events.length;
        
        // Find potential links for each event
        events.forEach(event => {
          const links = findPotentialLinks(event, dashboardData);
          if (links.length > 0) {
            const existingLink = linkedEvents.links.find(l => l.calendarUid === event.uid);
            if (!existingLink) {
              newLinks.push({
                id: generateId(),
                calendarUid: event.uid,
                calendarName: cal.name,
                eventSummary: event.summary,
                eventDate: event.startDate,
                links: links,
                createdAt: new Date().toISOString()
              });
            }
          }
        });
      } catch (err) {
        console.error(`Failed to sync calendar ${cal.name}:`, err.message);
      }
    }
    
    // Save new links
    if (newLinks.length > 0) {
      linkedEvents.links.push(...newLinks);
      writeData('linked-events.json', linkedEvents);
    }
    
    // Update last sync
    calendars.lastSync = new Date().toISOString();
    writeData('calendars.json', calendars);
    
    res.json({
      success: true,
      eventsSynced: totalEvents,
      newLinks: newLinks.length,
      lastSync: calendars.lastSync
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Add a new calendar
app.post('/api/calendars', (req, res) => {
  const calendars = readData('calendars.json');
  if (!calendars.connected) calendars.connected = [];
  
  const newCal = {
    id: generateId(),
    name: req.body.name,
    url: req.body.url,
    type: req.body.type || 'ical',
    color: req.body.color || '#3b82f6',
    addedAt: new Date().toISOString()
  };
  
  calendars.connected.push(newCal);
  writeData('calendars.json', calendars);
  
  res.json({ success: true, id: newCal.id });
});

// Delete a calendar
app.delete('/api/calendars/:id', (req, res) => {
  const calendars = readData('calendars.json');
  calendars.connected = (calendars.connected || []).filter(c => c.id !== req.params.id);
  writeData('calendars.json', calendars);
  res.json({ success: true });
});

// Create a manual link between calendar event and dashboard item
app.post('/api/linked-events', (req, res) => {
  const linkedEvents = readData('linked-events.json');
  if (!linkedEvents.links) linkedEvents.links = [];
  
  const newLink = {
    id: generateId(),
    calendarUid: req.body.calendarUid,
    calendarName: req.body.calendarName,
    eventSummary: req.body.eventSummary,
    eventDate: req.body.eventDate,
    links: req.body.links || [],
    notes: req.body.notes || '',
    createdAt: new Date().toISOString()
  };
  
  linkedEvents.links.push(newLink);
  writeData('linked-events.json', linkedEvents);
  
  res.json({ success: true, id: newLink.id });
});

// Delete a link
app.delete('/api/linked-events/:id', (req, res) => {
  const linkedEvents = readData('linked-events.json');
  linkedEvents.links = (linkedEvents.links || []).filter(l => l.id !== req.params.id);
  writeData('linked-events.json', linkedEvents);
  res.json({ success: true });
});

// === POST Routes (Original) ===

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

// === PATCH Routes (Original) ===

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
