// Joy Dashboard — Frontend JavaScript

// State
let currentTab = 'whats-on';
let currentData = {};
let currentDate = new Date();
let travelMap, localMap;

// Initialize
async function init() {
  lucide.createIcons();
  updateTime();
  setInterval(updateTime, 60000);
  
  await loadAllData();
  showTab('whats-on');
  initMaps();
}

function updateTime() {
  const now = new Date();
  document.getElementById('current-time').textContent = now.toLocaleTimeString('en-US', { 
    hour: 'numeric', 
    minute: '2-digit',
    hour12: true 
  });
  document.getElementById('current-date').textContent = now.toLocaleDateString('en-US', { 
    weekday: 'long', 
    month: 'short', 
    day: 'numeric' 
  });
}

async function loadAllData() {
  try {
    const endpoints = ['travel', 'local', 'events', 'experiences', 'media', 'discoveries', 'state'];
    for (const endpoint of endpoints) {
      const res = await fetch(`/api/${endpoint}`);
      currentData[endpoint] = await res.json();
    }
  } catch (err) {
    console.error('Failed to load data:', err);
  }
}

// Tab Navigation
function showTab(tabName) {
  // Hide all tabs
  document.querySelectorAll('.tab-content').forEach(tab => {
    tab.classList.add('hidden-tab');
  });
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.classList.remove('tab-active');
  });
  
  // Show selected tab
  document.getElementById(`content-${tabName}`).classList.remove('hidden-tab');
  document.getElementById(`tab-${tabName}`).classList.add('tab-active');
  
  currentTab = tabName;
  
  // Render tab content
  switch(tabName) {
    case 'whats-on': renderWhatsOn(); break;
    case 'travel': renderTravel(); break;
    case 'local': renderLocal(); break;
    case 'events': renderEvents(); break;
    case 'bucket': renderBucket(); break;
    case 'media': renderMedia(); break;
    case 'discoveries': renderDiscoveries(); break;
  }
  
  // Refresh icons
  lucide.createIcons();
}

// ===== TAB 1: WHAT'S ON =====
function renderWhatsOn() {
  const now = new Date();
  const hour = now.getHours();
  const day = now.getDay();
  
  // Tonight/This Weekend title
  const isWeekend = day === 0 || day === 6 || day === 5;
  document.getElementById('tonight-title').innerHTML = isWeekend ? 
    '<i data-lucide="sun" class="w-6 h-6 text-yellow-500 inline mr-2"></i>This Weekend' : 
    '<i data-lucide="moon" class="w-6 h-6 text-blue-500 inline mr-2"></i>Tonight';
  
  // Tonight content - show local recommendations
  const local = currentData.local?.places || [];
  const tonightHTML = local.slice(0, 2).map(place => `
    <div class="flex items-start gap-4 p-4 bg-dark-700 rounded-lg">
      <div class="w-12 h-12 bg-dark-600 rounded-lg flex items-center justify-center">
        <i data-lucide="map-pin" class="w-6 h-6 text-blue-500"></i>
      </div>
      <div class="flex-1">
        <h3 class="font-bold">${place.name}</h3>
        <p class="text-sm text-gray-400">${place.type} • ${place.area}</p>
        <p class="text-sm mt-1">${place.summary}</p>
      </div>
    </div>
  `).join('') || '<p class="text-gray-400">No recommendations yet. Check back soon!</p>';
  document.getElementById('tonight-content').innerHTML = tonightHTML;
  
  // Upcoming events
  const events = currentData.events?.events || [];
  const upcomingEvents = events
    .filter(e => new Date(e.date) >= now)
    .sort((a, b) => new Date(a.date) - new Date(b.date))
    .slice(0, 5);
  
  document.getElementById('upcoming-events').innerHTML = upcomingEvents.map(event => `
    <div class="flex items-center justify-between p-3 bg-dark-700 rounded-lg">
      <div>
        <h4 class="font-medium">${event.name}</h4>
        <p class="text-sm text-gray-400">${formatDate(event.date)} • ${event.location || 'TBD'}</p>
      </div>
      <div class="flex gap-2">
        <button onclick="updateEventInterest('${event.id}', 'going')" class="reaction-btn bg-green-600/20 hover:bg-green-600/40">🎯</button>
        <button onclick="updateEventInterest('${event.id}', 'maybe')" class="reaction-btn bg-yellow-600/20 hover:bg-yellow-600/40">🤔</button>
        <button onclick="updateEventInterest('${event.id}', 'pass')" class="reaction-btn bg-red-600/20 hover:bg-red-600/40">❌</button>
      </div>
    </div>
  `).join('') || '<p class="text-gray-400">No upcoming events found.</p>';
  
  // Latest discovery
  const discoveries = currentData.discoveries?.discoveries || [];
  const latest = discoveries[discoveries.length - 1];
  document.getElementById('latest-discovery').innerHTML = latest ? `
    <div class="p-4 bg-dark-700 rounded-lg">
      <div class="flex items-center gap-2 mb-2">
        <span class="category-badge bg-orange-600">${latest.category}</span>
        <span class="confidence-stars">${'⭐'.repeat(latest.confidence || 3)}</span>
      </div>
      <h3 class="text-lg font-bold mb-2">${latest.title}</h3>
      <p class="text-gray-300 mb-3">${latest.summary}</p>
      <p class="text-sm text-blue-400">${latest.whySteven || ''}</p>
    </div>
  ` : '<p class="text-gray-400">No discoveries yet.</p>';
  
  // Season content
  const month = now.getMonth();
  const season = month < 2 || month > 10 ? 'winter' : month < 5 ? 'spring' : month < 8 ? 'summer' : 'fall';
  const seasonData = currentData.events?.seasonalHighlights?.[season] || [];
  
  const seasonNames = { winter: 'Winter', spring: 'Spring', summer: 'Summer', fall: 'Fall' };
  const seasonIcons = { winter: 'snowflake', spring: 'flower-2', summer: 'sun', fall: 'leaf' };
  
  document.getElementById('season-content').innerHTML = `
    <div class="flex items-center gap-2 mb-3">
      <i data-lucide="${seasonIcons[season]}" class="w-5 h-5 text-green-500"></i>
      <span class="font-medium">${seasonNames[season]} in Ontario</span>
    </div>
    <ul class="space-y-2">
      ${seasonData.slice(0, 5).map(item => `<li class="flex items-start gap-2"><span class="text-green-500">•</span> ${item}</li>`).join('')}
    </ul>
  `;
}

// ===== TAB 2: TRAVEL =====
function renderTravel() {
  const travel = currentData.travel || {};
  const destinations = travel.destinations || [];
  const bucketList = travel.bucketListDestinations || [];
  
  // Count by status
  const counts = { dreaming: 0, researching: 0, planning: 0, booked: 0, completed: 0 };
  destinations.forEach(d => counts[d.status] = (counts[d.status] || 0) + 1);
  
  Object.keys(counts).forEach(status => {
    const el = document.getElementById(`count-${status}`);
    if (el) el.textContent = counts[status];
  });
  
  // Destinations list
  document.getElementById('destinations-list').innerHTML = destinations.map(dest => `
    <div class="card p-4">
      <div class="flex items-start justify-between mb-2">
        <div>
          <span class="category-badge ${getStatusColor(dest.status)}">${dest.status}</span>
          <span class="category-badge bg-blue-600 ml-2">${dest.type}</span>
        </div>
        <span class="text-2xl">${dest.interest === 'high' ? '🔥' : dest.interest === 'medium' ? '👍' : '🤔'}</span>
      </div>
      <h3 class="text-lg font-bold mb-1">${dest.name}</h3>
      <p class="text-sm text-gray-400 mb-2">${dest.summary}</p>
      <div class="flex flex-wrap gap-2 text-sm">
        <span class="text-gray-500">🗓️ ${dest.bestTime}</span>
        <span class="text-gray-500">💰 ${dest.estimatedBudget?.total || 'TBD'}</span>
      </div>
      ${dest.itinerary ? `
        <div class="mt-3 pt-3 border-t border-dark-600">
          <p class="text-sm font-medium mb-1">Itinerary Highlights:</p>
          <ul class="text-sm text-gray-400">
            ${dest.itinerary.slice(0, 3).map(day => `<li>Day ${day.day}: ${day.title}</li>`).join('')}
          </ul>
        </div>
      ` : ''}
    </div>
  `).join('') || '<p class="text-gray-400 col-span-2">No destinations yet. Start dreaming!</p>';
  
  // Bucket list
  document.getElementById('bucket-list-destinations').innerHTML = bucketList.map(dest => `
    <div class="card p-4 flex items-start gap-4">
      <div class="w-16 h-16 bg-dark-600 rounded-lg flex items-center justify-center text-2xl">
        🌍
      </div>
      <div class="flex-1">
        <h4 class="font-bold">${dest.name}</h4>
        <p class="text-sm text-gray-400">${dest.why}</p>
        <div class="flex gap-4 mt-2 text-sm text-gray-500">
          <span>Best: ${dest.bestTime}</span>
          <span>Budget: ${dest.roughBudget}</span>
        </div>
      </div>
      <span class="text-sm ${dest.priority === 'high' ? 'text-red-500' : dest.priority === 'medium' ? 'text-yellow-500' : 'text-gray-500'}">
        ${dest.priority}
      </span>
    </div>
  `).join('') || '<p class="text-gray-400">No bucket list destinations yet.</p>';
  
  // Update travel map
  updateTravelMap(destinations);
}

function getStatusColor(status) {
  const colors = {
    dreaming: 'bg-gray-600',
    researching: 'bg-yellow-600',
    planning: 'bg-orange-600',
    booked: 'bg-green-600',
    completed: 'bg-gray-500'
  };
  return colors[status] || 'bg-gray-600';
}

// ===== TAB 3: LOCAL =====
function renderLocal() {
  const local = currentData.local || {};
  const places = local.places || [];
  const dayTrips = local.dayTrips || [];
  
  renderPlacesList(places);
  
  // Day trips
  document.getElementById('day-trips-list').innerHTML = dayTrips.map(trip => `
    <div class="card p-4">
      <div class="flex items-start justify-between mb-2">
        <h3 class="font-bold">${trip.name}</h3>
        <span class="text-sm text-gray-400">${trip.distance}</span>
      </div>
      <p class="text-sm text-gray-400 mb-2">${trip.summary}</p>
      <div class="flex flex-wrap gap-3 text-sm">
        <span class="text-gray-500">⏱️ ${trip.duration}</span>
        <span class="text-gray-500">💰 ${trip.estimatedCost}</span>
        <span class="text-gray-500">🗓️ ${trip.bestTime}</span>
      </div>
    </div>
  `).join('') || '<p class="text-gray-400">No day trips added yet.</p>';
  
  // Update local map
  updateLocalMap(places);
}

function renderPlacesList(places) {
  document.getElementById('places-list').innerHTML = places.map(place => `
    <div class="card p-4 flex items-start gap-4">
      <div class="w-12 h-12 bg-dark-600 rounded-lg flex items-center justify-center text-xl">
        ${getPlaceIcon(place.type)}
      </div>
      <div class="flex-1">
        <div class="flex items-start justify-between">
          <div>
            <h4 class="font-bold">${place.name}</h4>
            <p class="text-sm text-gray-400">${place.type} • ${place.area} • ${place.priceRange}</p>
          </div>
          <span class="confidence-stars text-sm">${'⭐'.repeat(place.agentConfidence || 3)}</span>
        </div>
        <p class="text-sm mt-1">${place.summary}</p>
        <p class="text-sm text-blue-400 mt-1">${place.whySteven || ''}</p>
        ${place.tips ? `<p class="text-xs text-gray-500 mt-2">💡 ${place.tips[0]}</p>` : ''}
      </div>
      <div class="flex flex-col gap-2">
        <button onclick="updatePlaceReaction('${place.id}', 'loved')" class="reaction-btn bg-red-600/20 hover:bg-red-600/40 text-xl">❤️</button>
        <button onclick="updatePlaceReaction('${place.id}', 'meh')" class="reaction-btn bg-yellow-600/20 hover:bg-yellow-600/40 text-xl">😐</button>
        <button onclick="updatePlaceReaction('${place.id}', 'avoid')" class="reaction-btn bg-gray-600/20 hover:bg-gray-600/40 text-xl">❌</button>
      </div>
    </div>
  `).join('') || '<p class="text-gray-400">No places added yet.</p>';
}

function getPlaceIcon(type) {
  const icons = {
    restaurant: '🍽️',
    bar: '🍺',
    cafe: '☕',
    activity: '🎯',
    outdoors: '🌲',
    shopping: '🛍️',
    nightlife: '🌙'
  };
  return icons[type] || '📍';
}

function filterLocal(type) {
  const places = currentData.local?.places || [];
  const filtered = type === 'all' ? places : places.filter(p => p.type === type);
  renderPlacesList(filtered);
}

function surpriseMe() {
  const places = currentData.local?.places || [];
  const unvisited = places.filter(p => !p.stevenReaction);
  if (unvisited.length === 0) {
    alert('You\'ve tried all the places! Time to add more.');
    return;
  }
  const random = unvisited[Math.floor(Math.random() * unvisited.length)];
  alert(`🎲 Surprise Pick: ${random.name}\n\n${random.summary}\n\n${random.whySteven || ''}`);
}

function getLocation() {
  if (!navigator.geolocation) {
    alert('Geolocation not supported');
    return;
  }
  navigator.geolocation.getCurrentPosition(pos => {
    const { latitude, longitude } = pos.coords;
    if (localMap) {
      localMap.setView([latitude, longitude], 13);
      L.marker([latitude, longitude]).addTo(localMap)
        .bindPopup('You are here')
        .openPopup();
    }
  }, () => alert('Could not get location'));
}

// ===== TAB 4: EVENTS =====
function renderEvents() {
  renderCalendar();
  renderEventsList();
  renderSeasonalHighlights();
}

function renderCalendar() {
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  
  document.getElementById('calendar-month').textContent = 
    new Date(year, month).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  
  const events = currentData.events?.events || [];
  const eventDates = new Set(events.map(e => e.date));
  
  let html = '';
  
  // Empty cells before first day
  for (let i = 0; i < firstDay; i++) {
    html += '<div></div>';
  }
  
  // Days
  const today = new Date();
  for (let day = 1; day <= daysInMonth; day++) {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const isToday = today.getDate() === day && today.getMonth() === month && today.getFullYear() === year;
    const hasEvent = eventDates.has(dateStr);
    
    html += `
      <div class="calendar-day ${isToday ? 'today' : ''} ${hasEvent ? 'has-event' : 'bg-dark-700'}" 
           onclick="showEventsForDate('${dateStr}')">
        ${day}
      </div>
    `;
  }
  
  document.getElementById('calendar-grid').innerHTML = html;
}

function changeMonth(delta) {
  currentDate.setMonth(currentDate.getMonth() + delta);
  renderCalendar();
}

function renderEventsList() {
  const now = new Date();
  const events = currentData.events?.events || [];
  
  const upcoming = events
    .filter(e => new Date(e.date) >= now)
    .sort((a, b) => new Date(a.date) - new Date(b.date))
    .slice(0, 10);
  
  document.getElementById('events-list').innerHTML = upcoming.map(event => `
    <div class="card p-4">
      <div class="flex items-start justify-between">
        <div class="flex-1">
          <div class="flex items-center gap-2 mb-1">
            <span class="category-badge bg-pink-600">${event.type}</span>
            <span class="text-sm text-gray-400">${formatDate(event.date)}</span>
          </div>
          <h4 class="font-bold">${event.name}</h4>
          <p class="text-sm text-gray-400">${event.location}</p>
          <p class="text-sm mt-1">${event.summary}</p>
        </div>
        <div class="flex flex-col gap-2 ml-4">
          <button onclick="updateEventInterest('${event.id}', 'going')" class="reaction-btn bg-green-600/20 hover:bg-green-600/40">🎯</button>
          <button onclick="updateEventInterest('${event.id}', 'maybe')" class="reaction-btn bg-yellow-600/20 hover:bg-yellow-600/40">🤔</button>
          <button onclick="updateEventInterest('${event.id}', 'pass')" class="reaction-btn bg-red-600/20 hover:bg-red-600/40">❌</button>
        </div>
      </div>
    </div>
  `).join('') || '<p class="text-gray-400">No upcoming events.</p>';
}

function renderSeasonalHighlights() {
  const month = new Date().getMonth();
  const season = month < 2 || month > 10 ? 'winter' : month < 5 ? 'spring' : month < 8 ? 'summer' : 'fall';
  
  const seasonNames = { winter: 'Winter', spring: 'Spring', summer: 'Summer', fall: 'Fall' };
  document.getElementById('seasonal-title').textContent = `${seasonNames[season]} Highlights`;
  
  const highlights = currentData.events?.seasonalHighlights?.[season] || [];
  document.getElementById('seasonal-highlights').innerHTML = `
    <ul class="space-y-2">
      ${highlights.map(h => `<li class="flex items-start gap-2"><span class="text-pink-500">•</span> ${h}</li>`).join('')}
    </ul>
  `;
}

function showEventsForDate(dateStr) {
  const events = currentData.events?.events?.filter(e => e.date === dateStr) || [];
  if (events.length > 0) {
    alert(`Events on ${formatDate(dateStr)}:\n\n${events.map(e => `• ${e.name}`).join('\n')}`);
  }
}

// ===== TAB 5: BUCKET LIST =====
function renderBucket() {
  const experiences = currentData.experiences?.experiences || [];
  
  // Count by status
  const counts = { someday: 0, planning: 0, scheduled: 0, done: 0 };
  experiences.forEach(e => counts[e.status] = (counts[e.status] || 0) + 1);
  
  Object.keys(counts).forEach(status => {
    const el = document.getElementById(`bucket-${status}`);
    if (el) el.textContent = counts[status];
  });
  
  // Group by category
  const categories = {};
  experiences.forEach(exp => {
    if (!categories[exp.category]) categories[exp.category] = [];
    categories[exp.category].push(exp);
  });
  
  const categoryNames = {
    travel: '✈️ Travel',
    food: '🍽️ Food',
    adventure: '🏔️ Adventure',
    skill: '🎓 Skills',
    creative: '🎨 Creative',
    social: '👥 Social',
    wellness: '🧘 Wellness',
    tech: '💻 Tech'
  };
  
  document.getElementById('experiences-list').innerHTML = Object.entries(categories).map(([cat, items]) => `
    <div>
      <h3 class="font-bold text-lg mb-3">${categoryNames[cat] || cat}</h3>
      <div class="space-y-2">
        ${items.map(exp => `
          <div class="card p-3 flex items-center justify-between">
            <div class="flex-1">
              <div class="flex items-center gap-2">
                <span class="text-sm ${exp.priority === 'high' ? 'text-red-500' : exp.priority === 'medium' ? 'text-yellow-500' : 'text-gray-500'}">
                  ${exp.priority === 'high' ? '🔥' : exp.priority === 'medium' ? '👍' : '•'}
                </span>
                <span class="font-medium">${exp.title}</span>
                <span class="category-badge ${getStatusColor(exp.status)}">${exp.status}</span>
              </div>
              <p class="text-sm text-gray-400 mt-1">${exp.description?.substring(0, 100)}...</p>
            </div>
            <div class="flex gap-2 ml-4">
              ${exp.status !== 'done' ? `
                <button onclick="updateExperienceStatus('${exp.id}', 'done')" class="reaction-btn bg-green-600/20">✓</button>
              ` : ''}
            </div>
          </div>
        `).join('')}
      </div>
    </div>
  `).join('') || '<p class="text-gray-400">No experiences added yet.</p>';
}

// ===== TAB 6: MEDIA =====
function renderMedia() {
  const items = currentData.media?.items || [];
  
  // Currently watching
  const watching = items.filter(i => i.status === 'watching');
  if (watching.length > 0) {
    document.getElementById('currently-watching-section').classList.remove('hidden');
    document.getElementById('currently-watching').innerHTML = watching.map(item => `
      <div class="card p-4 flex items-start gap-4">
        <div class="w-16 h-20 bg-dark-600 rounded-lg flex items-center justify-center text-3xl">
          ${item.type === 'tv-show' ? '📺' : item.type === 'movie' ? '🎬' : item.type === 'documentary' ? '🎞️' : '📖'}
        </div>
        <div class="flex-1">
          <div class="flex items-center gap-2 mb-1">
            <span class="category-badge bg-blue-600">${item.type}</span>
            <span class="category-badge bg-purple-600">${item.platform}</span>
          </div>
          <h4 class="font-bold">${item.title}</h4>
          <p class="text-sm text-gray-400">${item.genre}</p>
          <p class="text-sm mt-1">${item.summary}</p>
        </div>
        <button onclick="updateMediaStatus('${item.id}', 'completed')" class="reaction-btn bg-green-600/20">✓ Done</button>
      </div>
    `).join('');
  }
  
  renderMediaList(items);
}

function renderMediaList(items) {
  const notWatched = items.filter(i => i.status !== 'watching' && i.status !== 'completed' && i.status !== 'dropped');
  
  document.getElementById('media-list').innerHTML = notWatched
    .sort((a, b) => (b.agentConfidence || 3) - (a.agentConfidence || 3))
    .map(item => `
    <div class="card p-4 flex items-start gap-4">
      <div class="w-12 h-12 bg-dark-600 rounded-lg flex items-center justify-center text-xl">
        ${item.type === 'tv-show' ? '📺' : item.type === 'movie' ? '🎬' : item.type === 'documentary' ? '🎞️' : '📖'}
      </div>
      <div class="flex-1">
        <div class="flex items-center gap-2 mb-1">
          <span class="category-badge bg-blue-600">${item.type}</span>
          <span class="category-badge bg-purple-600">${item.platform}</span>
          <span class="confidence-stars text-sm">${'⭐'.repeat(item.agentConfidence || 3)}</span>
        </div>
        <h4 class="font-bold">${item.title}</h4>
        <p class="text-sm text-gray-400">${item.genre}</p>
        <p class="text-sm mt-1">${item.summary}</p>
        <p class="text-sm text-blue-400 mt-1">${item.whySteven || ''}</p>
      </div>
      <div class="flex flex-col gap-2">
        <button onclick="updateMediaStatus('${item.id}', 'watching')" class="reaction-btn bg-blue-600/20">▶️ Start</button>
        <button onclick="updateMediaStatus('${item.id}', 'completed')" class="reaction-btn bg-green-600/20">✓ Done</button>
        <button onclick="updateMediaStatus('${item.id}', 'dropped')" class="reaction-btn bg-red-600/20">❌ Skip</button>
      </div>
    </div>
  `).join('') || '<p class="text-gray-400">No recommendations yet.</p>';
}

function filterMedia(type) {
  const items = currentData.media?.items || [];
  const filtered = type === 'all' ? items : items.filter(i => i.type === type);
  renderMediaList(filtered);
}

function pickTonight() {
  const items = currentData.media?.items?.filter(i => !i.status || i.status === 'recommended') || [];
  if (items.length === 0) {
    document.getElementById('tonight-pick').innerHTML = '<p class="text-gray-400">No unwatched recommendations.</p>';
    return;
  }
  
  const pick = items.sort((a, b) => (b.agentConfidence || 3) - (a.agentConfidence || 3))[0];
  document.getElementById('tonight-pick').innerHTML = `
    <div class="card p-4 bg-dark-700">
      <div class="flex items-start gap-4">
        <div class="w-16 h-20 bg-dark-600 rounded-lg flex items-center justify-center text-3xl">
          ${pick.type === 'tv-show' ? '📺' : pick.type === 'movie' ? '🎬' : '🎞️'}
        </div>
        <div class="flex-1">
          <div class="flex items-center gap-2 mb-1">
            <span class="category-badge bg-blue-600">${pick.type}</span>
            <span class="category-badge bg-purple-600">${pick.platform}</span>
            <span class="confidence-stars">${'⭐'.repeat(pick.agentConfidence || 3)}</span>
          </div>
          <h3 class="text-xl font-bold">${pick.title}</h3>
          <p class="text-gray-300 mt-2">${pick.summary}</p>
          <p class="text-blue-400 mt-2">${pick.whySteven || ''}</p>
          <div class="flex gap-2 mt-4">
            <button onclick="updateMediaStatus('${pick.id}', 'watching')" class="px-4 py-2 bg-blue-600 rounded-lg hover:bg-blue-700">
              ▶️ Watch This
            </button>
            <button onclick="pickTonight()" class="px-4 py-2 bg-dark-600 rounded-lg hover:bg-dark-500">
              🎲 Pick Another
            </button>
          </div>
        </div>
      </div>
    </div>
  `;
}

// ===== TAB 7: DISCOVERIES =====
function renderDiscoveries() {
  const discoveries = currentData.discoveries?.discoveries || [];
  
  // Weekly highlight
  const highlight = currentData.discoveries?.weeklyHighlight;
  if (highlight) {
    const disc = discoveries.find(d => d.id === highlight.id);
    if (disc) {
      document.getElementById('weekly-highlight').innerHTML = `
        <div class="p-4 bg-dark-700 rounded-lg">
          <div class="flex items-center gap-2 mb-2">
            <span class="category-badge bg-orange-600">${disc.category}</span>
            <span class="confidence-stars">${'⭐'.repeat(disc.confidence || 3)}</span>
          </div>
          <h3 class="text-lg font-bold mb-2">${disc.title}</h3>
          <p class="text-gray-300 mb-2">${disc.summary}</p>
          <p class="text-sm text-orange-400 mb-3">${highlight.reason}</p>
          <p class="text-sm text-blue-400">${disc.whySteven || ''}</p>
        </div>
      `;
    }
  }
  
  // Discovery feed
  renderDiscoveriesList(discoveries);
}

function renderDiscoveriesList(discoveries) {
  document.getElementById('discoveries-list').innerHTML = discoveries
    .sort((a, b) => new Date(b.addedAt) - new Date(a.addedAt))
    .map(disc => `
    <div class="card p-4">
      <div class="flex items-start justify-between mb-2">
        <div class="flex items-center gap-2">
          <span class="category-badge bg-orange-600">${disc.category}</span>
          <span class="confidence-stars text-sm">${'⭐'.repeat(disc.confidence || 3)}</span>
        </div>
        <span class="text-xs text-gray-500">${formatRelativeTime(disc.addedAt)}</span>
      </div>
      <h4 class="font-bold mb-1">${disc.title}</h4>
      <p class="text-sm text-gray-300">${disc.summary}</p>
      <p class="text-sm text-blue-400 mt-2">${disc.whySteven || ''}</p>
      <div class="flex gap-2 mt-3">
        <button onclick="updateDiscoveryReaction('${disc.id}', 'loved')" class="reaction-btn bg-red-600/20">❤️ Loved</button>
        <button onclick="updateDiscoveryReaction('${disc.id}', 'tried')" class="reaction-btn bg-green-600/20">✓ Tried</button>
        <button onclick="updateDiscoveryReaction('${disc.id}', 'pass')" class="reaction-btn bg-gray-600/20">Pass</button>
      </div>
    </div>
  `).join('') || '<p class="text-gray-400">No discoveries yet. Check back daily!</p>';
}

function filterDiscoveries(filter) {
  const discoveries = currentData.discoveries?.discoveries || [];
  const filtered = filter === 'new' ? discoveries.filter(d => !d.status || d.status === 'new') : discoveries;
  renderDiscoveriesList(filtered);
}

// ===== MAPS =====
function initMaps() {
  // Travel map
  travelMap = L.map('travel-map').setView([20, 0], 2);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap',
    maxZoom: 18
  }).addTo(travelMap);
  
  // Local map
  localMap = L.map('local-map').setView([43.3255, -79.7990], 12);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap',
    maxZoom: 18
  }).addTo(localMap);
}

function updateTravelMap(destinations) {
  if (!travelMap) return;
  
  // Clear existing markers
  travelMap.eachLayer(layer => {
    if (layer instanceof L.Marker) travelMap.removeLayer(layer);
  });
  
  const statusColors = {
    dreaming: 'blue',
    researching: 'yellow',
    planning: 'orange',
    booked: 'green',
    completed: 'gray'
  };
  
  destinations.forEach(dest => {
    if (dest.coordinates) {
      L.marker([dest.coordinates.lat, dest.coordinates.lng], {
        icon: L.divIcon({
          className: 'custom-marker',
          html: `<div style="background:${statusColors[dest.status] || 'blue'};width:12px;height:12px;border-radius:50%;border:2px solid white;"></div>`,
          iconSize: [16, 16]
        })
      }).addTo(travelMap)
        .bindPopup(`<b>${dest.name}</b><br>${dest.status}`);
    }
  });
}

function updateLocalMap(places) {
  if (!localMap) return;
  
  // Clear existing markers
  localMap.eachLayer(layer => {
    if (layer instanceof L.Marker) localMap.removeLayer(layer);
  });
  
  const typeColors = {
    restaurant: 'red',
    bar: 'purple',
    cafe: 'brown',
    activity: 'blue',
    outdoors: 'green'
  };
  
  places.forEach(place => {
    if (place.coordinates) {
      L.marker([place.coordinates.lat, place.coordinates.lng], {
        icon: L.divIcon({
          className: 'custom-marker',
          html: `<div style="background:${typeColors[place.type] || 'blue'};width:12px;height:12px;border-radius:50%;border:2px solid white;"></div>`,
          iconSize: [16, 16]
        })
      }).addTo(localMap)
        .bindPopup(`<b>${place.name}</b><br>${place.type} • ${place.area}`);
    }
  });
}

// ===== API UPDATE FUNCTIONS =====
async function updatePlaceReaction(id, reaction) {
  await fetch(`/api/local/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ stevenReaction: reaction })
  });
  await loadAllData();
  renderLocal();
}

async function updateEventInterest(id, interest) {
  await fetch(`/api/events/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ interest })
  });
  await loadAllData();
  renderEvents();
}

async function updateExperienceStatus(id, status) {
  await fetch(`/api/experiences/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status, completedAt: status === 'done' ? new Date().toISOString() : null })
  });
  await loadAllData();
  renderBucket();
}

async function updateMediaStatus(id, status) {
  await fetch(`/api/media/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status })
  });
  await loadAllData();
  renderMedia();
}

async function updateDiscoveryReaction(id, reaction) {
  await fetch(`/api/discoveries/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status: reaction, stevenRating: reaction === 'loved' ? 5 : reaction === 'tried' ? 3 : 1 })
  });
  await loadAllData();
  renderDiscoveries();
}

// ===== UTILITIES =====
function formatDate(dateStr) {
  return new Date(dateStr).toLocaleDateString('en-US', { 
    month: 'short', 
    day: 'numeric',
    year: 'numeric'
  });
}

function formatRelativeTime(dateStr) {
  const date = new Date(dateStr);
  const now = new Date();
  const diffDays = Math.floor((now - date) / (1000 * 60 * 60 * 24));
  
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
  return formatDate(dateStr);
}

// ===== CALENDAR SYNC FUNCTIONS =====

async function loadCalendarData() {
  try {
    const res = await fetch('/api/calendars');
    currentData.calendars = await res.json();
    
    const linkedRes = await fetch('/api/linked-events');
    currentData.linkedEvents = await linkedRes.json();
  } catch (err) {
    console.error('Failed to load calendar data:', err);
  }
}

function renderCalendarSync() {
  renderConnectedCalendars();
  renderCalendarEvents();
  renderLinkedEvents();
}

function renderConnectedCalendars() {
  const calendars = currentData.calendars?.connected || [];
  
  document.getElementById('connected-calendars').innerHTML = calendars.length === 0 ? 
    '<p class="text-gray-400">No calendars connected yet.</p>' :
    calendars.map(cal => `
      <div class="flex items-center justify-between p-3 bg-dark-700 rounded-lg">
        <div class="flex items-center gap-3">
          <div class="w-3 h-3 rounded-full" style="background-color: ${cal.color || '#3b82f6'}"></div>
          <div>
            <p class="font-medium">${cal.name}</p>
            <p class="text-xs text-gray-400">Added ${formatRelativeTime(cal.addedAt)}</p>
          </div>
        </div>
        <button onclick="deleteCalendar('${cal.id}')" class="p-2 hover:bg-red-600/20 rounded-lg text-red-400">
          <i data-lucide="trash-2" class="w-4 h-4"></i>
        </button>
      </div>
    `).join('');
  
  // Show last sync time
  if (currentData.calendars?.lastSync) {
    document.getElementById('connected-calendars').insertAdjacentHTML('afterend', `
      <p class="text-xs text-gray-500 mt-2">
        Last synced: ${formatRelativeTime(currentData.calendars.lastSync)}
      </p>
    `);
  }
}

async function renderCalendarEvents() {
  try {
    const res = await fetch('/api/calendar-events');
    const data = await res.json();
    const events = data.events || [];
    
    // Filter to upcoming events only
    const now = new Date();
    const upcoming = events
      .filter(e => new Date(e.startDate) >= now)
      .slice(0, 20);
    
    document.getElementById('calendar-events-list').innerHTML = upcoming.length === 0 ?
      '<p class="text-gray-400">No upcoming events found.</p>' :
      upcoming.map(event => `
        <div class="flex items-start justify-between p-3 bg-dark-700 rounded-lg">
          <div class="flex-1">
            <div class="flex items-center gap-2 mb-1">
              <span class="text-xs text-gray-400">${event.calendarName}</span>
              <span class="text-xs text-gray-500">•</span>
              <span class="text-xs text-blue-400">${formatDate(event.startDate)}</span>
            </div>
            <h4 class="font-medium">${event.summary}</h4>
            ${event.location ? `<p class="text-sm text-gray-400">📍 ${event.location}</p>` : ''}
            ${event.description ? `<p class="text-sm text-gray-500 mt-1">${event.description.substring(0, 100)}...</p>` : ''}
          </div>
          <button onclick="manualLinkEvent('${event.uid}', '${event.summary.replace(/'/g, "\\'")}', '${event.startDate}')" 
            class="px-3 py-1 bg-blue-600/20 hover:bg-blue-600/40 rounded-lg text-sm ml-2">
            Link
          </button>
        </div>
      `).join('');
  } catch (err) {
    document.getElementById('calendar-events-list').innerHTML = 
      '<p class="text-gray-400">Failed to load calendar events.</p>';
  }
}

function renderLinkedEvents() {
  const links = currentData.linkedEvents?.links || [];
  
  if (links.length === 0) {
    document.getElementById('linked-events-list').innerHTML = 
      '<p class="text-gray-400">No linked events yet. Events will auto-link when they match your dashboard items.</p>';
    return;
  }
  
  // Sort by date (newest first)
  const sortedLinks = links.sort((a, b) => new Date(b.eventDate) - new Date(a.eventDate));
  
  document.getElementById('linked-events-list').innerHTML = sortedLinks.map(link => `
    <div class="p-4 bg-dark-700 rounded-lg">
      <div class="flex items-start justify-between mb-2">
        <div>
          <h4 class="font-medium">${link.eventSummary}</h4>
          <p class="text-sm text-gray-400">${formatDate(link.eventDate)} • ${link.calendarName}</p>
        </div>
        <button onclick="deleteLinkedEvent('${link.id}')" class="text-red-400 hover:text-red-300">
          <i data-lucide="x" class="w-4 h-4"></i>
        </button>
      </div>
      
      <p class="text-sm text-gray-500 mb-2">Linked to:</p>
      <div class="flex flex-wrap gap-2">
        ${link.links.map(l => `
          <a href="#" onclick="showTab('${l.type === 'local' ? 'local' : l.type}'); return false;" 
            class="px-3 py-1 bg-blue-600/20 rounded-full text-sm hover:bg-blue-600/40">
            ${l.type === 'travel' ? '✈️' : l.type === 'local' ? '📍' : l.type === 'experience' ? '🗺️' : '🔗'} ${l.name}
          </a>
        `).join('')}
      </div>
      
      ${link.notes ? `<p class="text-sm text-gray-500 mt-2">📝 ${link.notes}</p>` : ''}
    </div>
  `).join('');
}

async function addCalendar() {
  const name = document.getElementById('cal-name').value.trim();
  const url = document.getElementById('cal-url').value.trim();
  
  if (!name || !url) {
    alert('Please enter both a name and URL');
    return;
  }
  
  try {
    await fetch('/api/calendars', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, url })
    });
    
    document.getElementById('cal-name').value = '';
    document.getElementById('cal-url').value = '';
    
    await loadCalendarData();
    renderConnectedCalendars();
    
    // Auto-sync after adding
    await syncCalendars();
  } catch (err) {
    alert('Failed to add calendar: ' + err.message);
  }
}

async function deleteCalendar(id) {
  if (!confirm('Remove this calendar?')) return;
  
  try {
    await fetch(`/api/calendars/${id}`, { method: 'DELETE' });
    await loadCalendarData();
    renderConnectedCalendars();
  } catch (err) {
    alert('Failed to remove calendar');
  }
}

async function syncCalendars() {
  const btn = document.querySelector('button[onclick="syncCalendars()"]');
  const originalText = btn.innerHTML;
  btn.innerHTML = '<i data-lucide="loader" class="w-4 h-4 animate-spin"></i> Syncing...';
  btn.disabled = true;
  
  try {
    const res = await fetch('/api/calendars/sync', { method: 'POST' });
    const data = await res.json();
    
    await loadCalendarData();
    renderCalendarEvents();
    renderLinkedEvents();
    renderConnectedCalendars();
    
    alert(`Synced ${data.eventsSynced} events. ${data.newLinks} new links found!`);
  } catch (err) {
    alert('Sync failed: ' + err.message);
  } finally {
    btn.innerHTML = originalText;
    btn.disabled = false;
    lucide.createIcons();
  }
}

function manualLinkEvent(uid, summary, date) {
  // Create a modal or simple prompt for linking
  const types = ['travel', 'local', 'experiences'];
  const typeNames = { travel: 'Travel Destination', local: 'Local Place', experiences: 'Experience' };
  
  const type = prompt(`Link "${summary}" to:\n1. Travel Destination\n2. Local Place\n3. Experience\n\nEnter number (1-3):`);
  if (!type || type < 1 || type > 3) return;
  
  const selectedType = types[type - 1];
  const items = currentData[selectedType === 'experiences' ? 'experiences' : selectedType];
  const itemList = selectedType === 'experiences' ? items.experiences : 
                   selectedType === 'travel' ? items.destinations : items.places;
  
  if (!itemList || itemList.length === 0) {
    alert(`No ${typeNames[selectedType]} items found. Add some first!`);
    return;
  }
  
  const itemNames = itemList.map((item, i) => `${i + 1}. ${item.name || item.title}`).join('\n');
  const itemIndex = prompt(`Select ${typeNames[selectedType]}:\n${itemNames}\n\nEnter number:`);
  
  if (!itemIndex || itemIndex < 1 || itemIndex > itemList.length) return;
  
  const selectedItem = itemList[itemIndex - 1];
  
  fetch('/api/linked-events', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      calendarUid: uid,
      calendarName: 'Manual',
      eventSummary: summary,
      eventDate: date,
      links: [{ type: selectedType, id: selectedItem.id, name: selectedItem.name || selectedItem.title }]
    })
  }).then(() => {
    loadCalendarData().then(() => renderLinkedEvents());
  });
}

async function deleteLinkedEvent(id) {
  if (!confirm('Remove this link?')) return;
  
  try {
    await fetch(`/api/linked-events/${id}`, { method: 'DELETE' });
    await loadCalendarData();
    renderLinkedEvents();
  } catch (err) {
    alert('Failed to remove link');
  }
}

// Update init function to load calendar data
const originalInit = init;
init = async function() {
  lucide.createIcons();
  updateTime();
  setInterval(updateTime, 60000);
  
  await loadAllData();
  await loadCalendarData();
  showTab('whats-on');
  initMaps();
};

// Update showTab to include calendar
const originalShowTab = showTab;
showTab = function(tabName) {
  // Hide all tabs
  document.querySelectorAll('.tab-content').forEach(tab => {
    tab.classList.add('hidden-tab');
  });
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.classList.remove('tab-active');
  });
  
  // Show selected tab
  document.getElementById(`content-${tabName}`).classList.remove('hidden-tab');
  document.getElementById(`tab-${tabName}`).classList.add('tab-active');
  
  currentTab = tabName;
  
  // Render tab content
  switch(tabName) {
    case 'whats-on': renderWhatsOn(); break;
    case 'travel': renderTravel(); break;
    case 'local': renderLocal(); break;
    case 'events': renderEvents(); break;
    case 'bucket': renderBucket(); break;
    case 'media': renderMedia(); break;
    case 'discoveries': renderDiscoveries(); break;
    case 'calendar': renderCalendarSync(); break;
  }
  
  // Refresh icons
  lucide.createIcons();
};

// ===== UTILITIES =====
function formatDate(dateStr) {
  return new Date(dateStr).toLocaleDateString('en-US', { 
    month: 'short', 
    day: 'numeric',
    year: 'numeric'
  });
}

// Start
init();
