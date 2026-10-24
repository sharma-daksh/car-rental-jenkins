import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import {
  Activity, AlertCircle, ArrowDownRight, ArrowRight, ArrowUpRight,
  Bell, CarFront, Check, ChevronDown, CircleHelp, Clock3, Gauge,
  LayoutDashboard, LoaderCircle, LogOut, Menu, MoreHorizontal,
  Plus, Search, ShieldCheck, SlidersHorizontal,
  Users, Wallet, Wrench, X, CalendarDays, Fuel, Moon, Sun,
  Pencil, Trash2, RefreshCw, CircleCheck, CircleX, KeyRound, Mail, Phone,
} from 'lucide-react';
import './styles.css';

const API = '/api/cars';
const CUSTOMER_API = '/api/customers';
const RENTAL_API = '/api/rentals';
const EMPTY_FORM = {
  brand: '', model: '', registrationNumber: '', fuelType: 'Petrol',
  rentalPrice: '', status: 'AVAILABLE',
};
const EMPTY_CUSTOMER_FORM = { fullName: '', email: '', phone: '', licenseNumber: '', address: '' };
function localDate(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}
const EMPTY_RENTAL_FORM = {
  customerId: '', carId: '', startDate: localDate(),
  endDate: localDate(new Date(Date.now() + 86400000)), notes: '',
};

async function apiRequest(url, options = {}) {
  const response = await fetch(url, {
    ...options,
    headers: {
      ...(options.body ? { 'Content-Type': 'application/json' } : {}),
      ...options.headers,
    },
  });
  if (!response.ok) {
    let detail = '';
    try {
      detail = await response.text();
      if (detail) {
        try { detail = JSON.parse(detail).message || detail; } catch { /* Keep plain-text server errors. */ }
      }
    } catch {
      // The response might not have a body.
    }
    if (response.status === 401 || response.status === 403) {
      throw new Error('The API is protected by Spring Security. Apply the demo security configuration from backend-patch, then restart with the demo profile.');
    }
    throw new Error(detail || `Request failed with HTTP ${response.status}`);
  }
  if (response.status === 204) return null;
  const text = await response.text();
  return text ? JSON.parse(text) : null;
}

function statusLabel(status) {
  const normalized = (status || 'AVAILABLE').toUpperCase();
  if (normalized === 'AVAILABLE') return 'Available';
  if (normalized === 'BOOKED') return 'Booked';
  if (normalized === 'ACTIVE' || normalized === 'RENTED') return 'On rent';
  if (normalized === 'MAINTENANCE') return 'Maintenance';
  if (normalized === 'COMPLETED') return 'Completed';
  return normalized.charAt(0) + normalized.slice(1).toLowerCase();
}

function statusClass(status) {
  const normalized = (status || 'AVAILABLE').toLowerCase();
  if (normalized === 'available') return 'available';
  if (normalized === 'booked') return 'booked';
  if (normalized === 'active' || normalized === 'rented') return 'rented';
  if (normalized === 'maintenance') return 'maintenance';
  return 'neutral';
}

function currency(value) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency', currency: 'INR', maximumFractionDigits: 0,
  }).format(Number(value) || 0);
}

function vehicleImage(car, index = 0) {
  const identity = `${car?.brand || ''} ${car?.model || ''}`.toLowerCase();
  const fuel = String(car?.fuelType || '').toLowerCase();
  if (fuel.includes('electric') || /\b(ev|atto|zs ev)\b/.test(identity)) return '/images/car-electric.jpg';
  if (/\b(city|verna|slavia|virtus|sedan|camry|accord)\b/.test(identity)) return '/images/car-sedan.jpg';
  if (/\b(creta|xuv|fortuner|crysta|nexon|punch|thar|safari|harrier|scorpio|ertiga|carens|hyryder|elevate|kiger|sonet|suv)\b/.test(identity)) return '/images/car-suv.jpg';
  const fallbackImages = ['/images/car-hatchback.jpg', '/images/car-sedan.jpg', '/images/car-suv.jpg', '/images/car-electric.jpg'];
  const stableHash = Array.from(identity).reduce((hash, character) => (hash * 31 + character.charCodeAt(0)) >>> 0, 7);
  return fallbackImages[stableHash % fallbackImages.length];
}

const OPEN_RENTAL_STATUSES = new Set(['RESERVED', 'BOOKED', 'ACTIVE']);

function App() {
  const [activePage, setActivePage] = useState('Home');
  const [theme, setTheme] = useState(() => {
    try { return localStorage.getItem('rove-theme') === 'dark' ? 'dark' : 'light'; }
    catch { return 'light'; }
  });
  const [cars, setCars] = useState([]);
  const [loading, setLoading] = useState(true);
  const [apiError, setApiError] = useState('');
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('All vehicles');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingCar, setEditingCar] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState('');
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [customers, setCustomers] = useState([]);
  const [customersLoading, setCustomersLoading] = useState(true);
  const [customersError, setCustomersError] = useState('');
  const [customerModalOpen, setCustomerModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState(null);
  const [customerForm, setCustomerForm] = useState(EMPTY_CUSTOMER_FORM);
  const [customerSaving, setCustomerSaving] = useState(false);
  const [rentals, setRentals] = useState([]);
  const [rentalsLoading, setRentalsLoading] = useState(true);
  const [rentalsError, setRentalsError] = useState('');
  const [rentalModalOpen, setRentalModalOpen] = useState(false);
  const [rentalForm, setRentalForm] = useState(EMPTY_RENTAL_FORM);
  const [rentalSaving, setRentalSaving] = useState(false);
  const [rentalStatusSaving, setRentalStatusSaving] = useState(null);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    try { localStorage.setItem('rove-theme', theme); } catch { /* Theme still works for this session. */ }
  }, [theme]);

  const loadCars = useCallback(async () => {
    setLoading(true);
    try {
      const result = await apiRequest(API);
      setCars(Array.isArray(result) ? result : []);
      setApiError('');
    } catch (error) {
      setApiError(error.message || 'Could not load the car inventory.');
    } finally {
      setLoading(false);
    }
  }, []);

  const loadCustomers = useCallback(async () => {
    setCustomersLoading(true);
    try {
      const result = await apiRequest(CUSTOMER_API);
      setCustomers(Array.isArray(result) ? result : []);
      setCustomersError('');
    } catch (error) {
      setCustomersError(error.message || 'Could not load customers.');
    } finally {
      setCustomersLoading(false);
    }
  }, []);

  const loadRentals = useCallback(async () => {
    setRentalsLoading(true);
    try {
      const result = await apiRequest(RENTAL_API);
      setRentals(Array.isArray(result) ? result : []);
      setRentalsError('');
    } catch (error) {
      setRentalsError(error.message || 'Could not load rentals.');
    } finally {
      setRentalsLoading(false);
    }
  }, []);

  useEffect(() => { loadCars(); }, [loadCars]);
  useEffect(() => { loadCustomers(); }, [loadCustomers]);
  useEffect(() => { loadRentals(); }, [loadRentals]);
  useEffect(() => {
    if (!toast) return undefined;
    const timer = window.setTimeout(() => setToast(''), 3200);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const counts = useMemo(() => {
    const available = cars.filter((car) => (car.status || 'AVAILABLE').toUpperCase() === 'AVAILABLE').length;
    const booked = cars.filter((car) => ['BOOKED', 'ACTIVE', 'RENTED'].includes((car.status || '').toUpperCase())).length;
    const service = cars.filter((car) => (car.status || '').toUpperCase() === 'MAINTENANCE').length;
    const dailyRevenuePotential = cars
      .filter((car) => (car.status || 'AVAILABLE').toUpperCase() === 'ACTIVE')
      .reduce((sum, car) => sum + (Number(car.rentalPrice) || 0), 0);
    return { total: cars.length, available, booked, service, dailyRevenuePotential };
  }, [cars]);

  const filteredCars = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return cars.filter((car) => {
      const searchable = [car.brand, car.model, car.registrationNumber, car.fuelType, car.status]
        .filter(Boolean).join(' ').toLowerCase();
      const matchesQuery = !normalizedQuery || searchable.includes(normalizedQuery);
      const matchesStatus = statusFilter === 'All vehicles'
        || (car.status || 'AVAILABLE').toUpperCase() === statusFilter.toUpperCase();
      return matchesQuery && matchesStatus;
    });
  }, [cars, query, statusFilter]);

  const featuredCars = useMemo(() => cars.slice(0, 4), [cars]);

  function openCreate() {
    setEditingCar(null);
    setForm(EMPTY_FORM);
    setModalOpen(true);
  }

  function openEdit(car) {
    setEditingCar(car);
    setForm({
      brand: car.brand || '', model: car.model || '',
      registrationNumber: car.registrationNumber || '',
      fuelType: car.fuelType || 'Petrol', rentalPrice: car.rentalPrice ?? '',
      status: car.status || 'AVAILABLE',
    });
    setModalOpen(true);
  }

  async function saveCar(event) {
    event.preventDefault();
    setSaving(true);
    try {
      const payload = {
        ...form,
        brand: form.brand.trim(),
        model: form.model.trim(),
        registrationNumber: form.registrationNumber.trim().toUpperCase(),
        rentalPrice: Number(form.rentalPrice),
      };
      const url = editingCar ? `${API}/${editingCar.id}` : API;
      await apiRequest(url, {
        method: editingCar ? 'PUT' : 'POST',
        body: JSON.stringify(payload),
      });
      setModalOpen(false);
      setToast(editingCar ? 'Vehicle updated successfully.' : 'Vehicle added to your fleet.');
      await loadCars();
    } catch (error) {
      setToast(error.message || 'Could not save this vehicle.');
    } finally {
      setSaving(false);
    }
  }

  async function deleteCar(car) {
    const confirmed = window.confirm(`Delete ${car.brand} ${car.model} (${car.registrationNumber})?`);
    if (!confirmed) return;
    try {
      await apiRequest(`${API}/${car.id}`, { method: 'DELETE' });
      setToast('Vehicle deleted.');
      await loadCars();
    } catch (error) {
      setToast(error.message || 'Could not delete this vehicle.');
    }
  }

  function openCreateCustomer() {
    setEditingCustomer(null);
    setCustomerForm(EMPTY_CUSTOMER_FORM);
    setCustomerModalOpen(true);
  }

  function openEditCustomer(customer) {
    setEditingCustomer(customer);
    setCustomerForm({
      fullName: customer.fullName || '', email: customer.email || '',
      phone: customer.phone || '', licenseNumber: customer.licenseNumber || '',
      address: customer.address || '',
    });
    setCustomerModalOpen(true);
  }

  async function saveCustomer(event) {
    event.preventDefault();
    setCustomerSaving(true);
    try {
      const payload = {
        fullName: customerForm.fullName.trim(), email: customerForm.email.trim() ? customerForm.email.trim().toLowerCase() : null,
        phone: customerForm.phone.trim(), licenseNumber: customerForm.licenseNumber.trim().toUpperCase(),
        address: customerForm.address.trim(),
      };
      await apiRequest(editingCustomer ? `${CUSTOMER_API}/${editingCustomer.id}` : CUSTOMER_API, {
        method: editingCustomer ? 'PUT' : 'POST', body: JSON.stringify(payload),
      });
      setCustomerModalOpen(false);
      setToast(editingCustomer ? 'Customer updated successfully.' : 'Customer added successfully.');
      await loadCustomers();
    } catch (error) {
      setToast(error.message || 'Could not save customer.');
    } finally {
      setCustomerSaving(false);
    }
  }

  async function deleteCustomer(customer) {
    if (!window.confirm(`Delete customer ${customer.fullName}?`)) return;
    try {
      await apiRequest(`${CUSTOMER_API}/${customer.id}`, { method: 'DELETE' });
      setToast('Customer deleted.');
      await loadCustomers();
    } catch (error) {
      setToast(error.message || 'Could not delete customer. Existing rentals may reference this customer.');
    }
  }

  function openCreateRental() {
    const availableCars = cars.filter((car) => (car.status || '').toUpperCase() === 'AVAILABLE');
    setRentalForm({ ...EMPTY_RENTAL_FORM, startDate: localDate(), endDate: localDate(new Date(Date.now() + 86400000)), customerId: customers[0] ? String(customers[0].id) : '', carId: availableCars[0] ? String(availableCars[0].id) : '' });
    setRentalModalOpen(true);
  }

  async function createRental(event) {
    event.preventDefault();
    const today = localDate();
    if (!rentalForm.customerId || !rentalForm.carId) {
      setToast('Choose a customer and an available vehicle first.');
      return;
    }
    if (!rentalForm.startDate || !rentalForm.endDate) {
      setToast('Choose both a start date and an end date.');
      return;
    }
    if (rentalForm.startDate < today) {
      setToast('The rental start date cannot be in the past.');
      return;
    }
    if (rentalForm.endDate < rentalForm.startDate) {
      setToast('The return date must be on or after the start date.');
      return;
    }
    const selectedCar = cars.find((car) => String(car.id) === String(rentalForm.carId));
    if (!selectedCar || String(selectedCar.status || '').toUpperCase() !== 'AVAILABLE') {
      setToast('That vehicle is no longer available. Refresh the inventory and choose another vehicle.');
      await loadCars();
      return;
    }
    const existingOpenRental = rentals.find((rental) =>
      String(rental.carId ?? rental.vehicleId) === String(selectedCar.id)
      && OPEN_RENTAL_STATUSES.has(String(rental.status || '').toUpperCase())
    );
    if (existingOpenRental) {
      setToast('This vehicle already has an open rental. Choose another vehicle.');
      await Promise.all([loadRentals(), loadCars()]);
      return;
    }
    setRentalSaving(true);
    try {
      const payload = {
        customerId: Number(rentalForm.customerId), carId: Number(rentalForm.carId),
        startDate: rentalForm.startDate, endDate: rentalForm.endDate,
        notes: rentalForm.notes.trim(),
      };
      await apiRequest(RENTAL_API, { method: 'POST', body: JSON.stringify(payload) });
      setRentalModalOpen(false);
      setToast('Rental created and vehicle availability updated.');
      await Promise.all([loadRentals(), loadCars()]);
    } catch (error) {
      setToast(error.message || 'Could not create rental.');
    } finally {
      setRentalSaving(false);
    }
  }

  async function updateRentalStatus(rental, status) {
    if (status === rental.status) return;
    setRentalStatusSaving(rental.id);
    try {
      await apiRequest(`${RENTAL_API}/${rental.id}/status`, {
        method: 'PATCH', body: JSON.stringify({ status }),
      });
      setToast(`Rental status changed to ${statusLabel(status)}.`);
      await Promise.all([loadRentals(), loadCars()]);
    } catch (error) {
      setToast(error.message || 'Could not update rental status.');
      await loadRentals();
    } finally {
      setRentalStatusSaving(null);
    }
  }

  const goTo = (page) => {
    setActivePage(page);
    setMobileNavOpen(false);
    if (page === 'Vehicles') setStatusFilter('All vehicles');
  };

  return (
    <div className={`app-shell theme-${theme}`}>
      <div className="starfield" aria-hidden="true">
        <span className="star star-a" /><span className="star star-b" /><span className="star star-c" />
        <span className="star star-d" /><span className="star star-e" /><span className="star star-f" />
        <span className="star star-g" /><span className="star star-h" /><span className="star star-i" />
        <span className="shooting-star shooting-a" /><span className="shooting-star shooting-b" />
      </div>
      {mobileNavOpen && <button className="mobile-scrim" aria-label="Close navigation" onClick={() => setMobileNavOpen(false)} />}
      <aside className={`sidebar ${mobileNavOpen ? 'sidebar-open' : ''}`}>
        <div className="brand-lockup">
          <div className="brand-mark"><CarFront size={23} strokeWidth={2.2} /></div>
          <div><div className="brand-name">rove<span>.</span></div><div className="brand-caption">FLEET OPERATIONS</div></div>
          <button className="icon-button sidebar-close" aria-label="Close menu" onClick={() => setMobileNavOpen(false)}><X size={18} /></button>
        </div>
        <div className="workspace-switcher">
          <div className="workspace-avatar">R</div>
          <div className="workspace-copy"><strong>Rove Rentals</strong><span>Workspace</span></div>
          <ChevronDown size={15} className="muted-icon" />
        </div>
        <div className="nav-label">WORKSPACE</div>
        <nav className="main-nav" aria-label="Main navigation">
          <button className={`nav-item ${activePage === 'Home' ? 'active' : ''}`} onClick={() => goTo('Home')}><LayoutDashboard size={18} /><span>Home</span></button>
          <button className={`nav-item ${activePage === 'Vehicles' ? 'active' : ''}`} onClick={() => goTo('Vehicles')}><CarFront size={18} /><span>Vehicles</span><span className="nav-count">{cars.length}</span></button>
          <button className={`nav-item ${activePage === 'Rentals' ? 'active' : ''}`} onClick={() => goTo('Rentals')}><CalendarDays size={18} /><span>Rentals</span><span className="nav-count">{rentals.length}</span></button>
          <button className={`nav-item ${activePage === 'Customers' ? 'active' : ''}`} onClick={() => goTo('Customers')}><Users size={18} /><span>Customers</span><span className="nav-count">{customers.length}</span></button>
        </nav>
        <div className="sidebar-bottom">
          <div className="help-card"><div className="help-icon"><CircleHelp size={17} /></div><strong>Need a hand?</strong><p>Find your way around Rove.</p><button onClick={() => setToast('Help centre will be added in a future iteration.')}>Visit help centre <ArrowRight size={14} /></button></div>
          <div className="profile-row"><div className="profile-avatar">DS</div><div className="profile-copy"><strong>Daksh Sharma</strong><span>Fleet administrator</span></div><button className="icon-button profile-menu" aria-label="Account menu" onClick={() => setToast('Account settings will be added later.')}><MoreHorizontal size={19} /></button></div>
        </div>
      </aside>

      <main className="main-panel">
        <header className="topbar">
          <button className="icon-button mobile-menu" aria-label="Open navigation" onClick={() => setMobileNavOpen(true)}><Menu size={20} /></button>
          <div className="breadcrumb"><span>Workspace</span><span className="crumb-separator">/</span><strong>{activePage}</strong></div>
          <div className="topbar-actions">
            <div className="global-search"><Search size={16} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={`Search ${activePage.toLowerCase()}...`} aria-label={`Search ${activePage.toLowerCase()}`} /><kbd>⌘ K</kbd></div>
            <button className="icon-button theme-toggle" title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'} aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'} onClick={() => setTheme((current) => current === 'dark' ? 'light' : 'dark')}>{theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}</button>
            <button className="icon-button notification-button" aria-label="Notifications" onClick={() => setToast('You are all caught up.')}><Bell size={18} /><span /></button>
            <div className="topbar-divider" />
            <div className="topbar-user"><div className="topbar-avatar">DS</div><ChevronDown size={14} className="muted-icon" /></div>
          </div>
        </header>

        {activePage === 'Home' && (
          <div className="page-content home-content">
            <section className="landing-hero">
              <div className="landing-hero-copy">
                <div className="hero-kicker"><span className="hero-live-dot" /> ROVE RENTALS <span className="hero-kicker-divider" /> DRIVE SMARTER</div>
                <h1>Drive your <span>next adventure.</span></h1>
                <p>Find the right ride, book in a few clicks, and keep every journey moving. Your fleet, your customers, your rentals — all in one workspace.</p>
                <div className="landing-hero-actions">
                  <button className="button button-primary hero-primary" onClick={() => goTo('Vehicles')}>Explore the fleet <ArrowRight size={17} /></button>
                  <button className="button button-glass" onClick={openCreateRental} disabled={!customers.length || !cars.some((car) => String(car.status || '').toUpperCase() === 'AVAILABLE')}>Create a rental <CalendarDays size={16} /></button>
                </div>
                <div className="hero-micro-stats">
                  <div><strong>{loading ? '—' : counts.available}</strong><span>vehicles ready</span></div>
                  <div className="hero-stat-separator" />
                  <div><strong>{customersLoading ? '—' : customers.length}</strong><span>customers</span></div>
                  <div className="hero-stat-separator" />
                  <div><strong>{rentalsLoading ? '—' : rentals.length}</strong><span>rental records</span></div>
                </div>
              </div>
              <div className="landing-hero-visual">
                <div className="hero-image-halo" />
                <img src="/images/rove-hero.jpg" alt="Illustrative premium car in a neon night setting" />
                <div className="hero-image-caption"><span className="hero-image-caption-dot" /><div><strong>Every ride starts here</strong><span>Rove Fleet Workspace</span></div><ArrowUpRight size={18} /></div>
                <div className="hero-orbit orbit-one" /><div className="hero-orbit orbit-two" />
              </div>
              <div className="hero-bottom-glow" />
            </section>

            <section className="featured-fleet-section">
              <div className="section-heading"><div><div className="eyebrow"><span className="eyebrow-dot" /> YOUR COLLECTION</div><h2>Find your kind of drive.</h2><p>Quick look at the vehicles in your fleet.</p></div><button className="link-button" onClick={() => goTo('Vehicles')}>View all vehicles <ArrowRight size={15} /></button></div>
              {featuredCars.length ? <div className="featured-car-grid">{featuredCars.map((car, index) => <article className="featured-car-card" key={car.id}>
                <div className="featured-car-image"><img src={vehicleImage(car, index)} alt={`Illustrative ${car.brand} ${car.model}`} loading="lazy" /><span className={`featured-car-status ${statusClass(car.status)}`}><span />{statusLabel(car.status)}</span><span className="featured-car-image-index">0{index + 1}</span></div>
                <div className="featured-car-info"><div><span className="featured-car-meta">{car.fuelType || 'Flexible drive'} <span>·</span> Fleet vehicle</span><h3>{car.brand} {car.model}</h3><span className="featured-car-plate">{car.registrationNumber || `Vehicle #${car.id}`}</span></div><div className="featured-car-bottom"><strong>{currency(car.rentalPrice)}<span>/day</span></strong><button aria-label={`View ${car.brand} ${car.model} in vehicle inventory`} onClick={() => goTo('Vehicles')}><ArrowUpRight size={17} /></button></div></div>
              </article>)}</div> : <div className="featured-empty"><CarFront size={24} /><strong>Your fleet starts here</strong><span>Add a vehicle to see your collection on the home page.</span><button className="button button-primary" onClick={openCreate}><Plus size={15} /> Add first vehicle</button></div>}
            </section>

            <div className="page-heading heading-with-actions home-dashboard-heading"><div><div className="eyebrow"><span className="eyebrow-dot" /> FLEET OVERVIEW</div><h2>Your fleet, at a glance.</h2><p className="page-subtitle">Live operations and availability, all in one place.</p></div><div className="heading-actions"><button className="button button-secondary" onClick={() => Promise.all([loadCars(), loadCustomers(), loadRentals()])} disabled={loading || customersLoading || rentalsLoading}><RefreshCw size={16} className={loading || customersLoading || rentalsLoading ? 'spin' : ''} /> Refresh</button><button className="button button-primary" onClick={openCreate}><Plus size={17} /> Add vehicle</button></div></div>
            {apiError && <ApiNotice message={apiError} onRetry={loadCars} />}
            <section className="stats-grid" aria-label="Fleet statistics">
              <StatCard icon={<CarFront size={19} />} iconClass="purple" label="Total vehicles" value={loading ? '—' : counts.total} note="In your fleet" trend={<span className="stat-neutral"><Activity size={13} /> Live inventory</span>} />
              <StatCard icon={<CircleCheck size={19} />} iconClass="green" label="Available now" value={loading ? '—' : counts.available} note="Ready to book" trend={<span className="stat-good"><ArrowUpRight size={13} /> Fleet ready</span>} />
              <StatCard icon={<KeyRound size={19} />} iconClass="amber" label="On rent / booked" value={loading ? '—' : counts.booked} note="Currently allocated" trend={<span className="stat-neutral"><Clock3 size={13} /> Live status</span>} />
              <StatCard icon={<Wrench size={19} />} iconClass="blue" label="In maintenance" value={loading ? '—' : counts.service} note="Needs attention" trend={<span className={counts.service ? 'stat-warn' : 'stat-good'}>{counts.service ? 'Review required' : 'All clear'}</span>} />
            </section>

            <section className="insight-banner"><div className="insight-icon"><Gauge size={21} /></div><div className="insight-copy"><strong>Keep your fleet moving</strong><p>{counts.total === 0 ? 'Add your first vehicle to start tracking availability and manage your inventory in one place.' : `${counts.available} of ${counts.total} vehicles are currently available. Keep vehicle statuses updated to get a clearer picture of your fleet.`}</p></div><button className="text-button" onClick={() => goTo('Vehicles')}>View inventory <ArrowRight size={15} /></button><div className="insight-orbit orbit-one" /><div className="insight-orbit orbit-two" /></section>

            <div className="content-grid">
              <section className="panel inventory-panel">
                <div className="panel-header"><div><h2>Vehicle inventory</h2><p>Your recently added and updated vehicles.</p></div><button className="link-button" onClick={() => goTo('Vehicles')}>View all <ArrowRight size={15} /></button></div>
                <VehicleTable cars={cars.slice(0, 5)} loading={loading} onEdit={openEdit} onDelete={deleteCar} onAdd={openCreate} />
              </section>
              <section className="panel availability-panel">
                <div className="panel-header"><div><h2>Fleet availability</h2><p>Breakdown by current status.</p></div><div className="panel-more"><MoreHorizontal size={19} /></div></div>
                <div className="availability-total"><strong>{loading ? '—' : counts.total}</strong><span>Total vehicles</span></div>
                <div className="availability-bar" aria-label="Fleet availability breakdown"><span className="bar-available" style={{ width: `${counts.total ? counts.available / counts.total * 100 : 0}%` }} /><span className="bar-booked" style={{ width: `${counts.total ? counts.booked / counts.total * 100 : 0}%` }} /><span className="bar-service" style={{ width: `${counts.total ? counts.service / counts.total * 100 : 0}%` }} /></div>
                <div className="legend-list"><LegendRow color="available-color" label="Available" value={loading ? '—' : counts.available} /><LegendRow color="booked-color" label="On rent / booked" value={loading ? '—' : counts.booked} /><LegendRow color="service-color" label="Maintenance" value={loading ? '—' : counts.service} /></div>
                <div className="panel-footnote"><ShieldCheck size={15} /><span>Counts are calculated from the live inventory API.</span></div>
              </section>
            </div>
            <div className="bottom-note"><div className="note-symbol"><Activity size={16} /></div><div><strong>Live fleet data</strong><span>Dashboard information is loaded from your Spring Boot car-management API.</span></div><span className={`connection-pill ${apiError ? 'offline' : loading ? 'loading' : 'online'}`}><span />{apiError ? 'API unavailable' : loading ? 'Connecting' : 'API connected'}</span></div>
          </div>
        )}

        {activePage === 'Vehicles' && (
          <div className="page-content">
            <div className="page-heading heading-with-actions"><div><div className="eyebrow"><span className="eyebrow-dot" /> FLEET MANAGEMENT</div><h1>Vehicles</h1><p className="page-subtitle">Manage your fleet, daily rates, and availability.</p></div><div className="heading-actions"><button className="button button-secondary" onClick={loadCars} disabled={loading}><RefreshCw size={16} className={loading ? 'spin' : ''} /> Refresh</button><button className="button button-primary" onClick={openCreate}><Plus size={17} /> Add vehicle</button></div></div>
            {apiError && <ApiNotice message={apiError} onRetry={loadCars} />}
            <section className="panel full-inventory-panel"><div className="inventory-toolbar"><div className="inventory-total"><strong>All vehicles</strong><span>{filteredCars.length} record{filteredCars.length === 1 ? '' : 's'}</span></div><div className="inventory-controls"><label className="filter-search"><Search size={16} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search by vehicle or plate" /></label><label className="status-select-wrap"><SlidersHorizontal size={15} /><select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} aria-label="Filter vehicle status"><option>All vehicles</option><option value="AVAILABLE">Available</option><option value="BOOKED">Booked</option><option value="ACTIVE">Active / on rent</option><option value="MAINTENANCE">Maintenance</option></select><ChevronDown size={14} /></label></div></div><VehicleTable cars={filteredCars} loading={loading} onEdit={openEdit} onDelete={deleteCar} onAdd={openCreate} /></section>
            <div className="bottom-note"><div className="note-symbol"><ShieldCheck size={16} /></div><div><strong>Changes are saved to your backend</strong><span>Vehicle actions call the Spring Boot REST API on your local machine.</span></div><span className={`connection-pill ${apiError ? 'offline' : loading ? 'loading' : 'online'}`}><span />{apiError ? 'API unavailable' : loading ? 'Connecting' : 'API connected'}</span></div>
          </div>
        )}

        {activePage === 'Customers' && <CustomersPage
          customers={customers} loading={customersLoading} error={customersError} query={query}
          onRefresh={loadCustomers} onCreate={openCreateCustomer} onEdit={openEditCustomer} onDelete={deleteCustomer}
        />}
        {activePage === 'Rentals' && <RentalsPage
          rentals={rentals} customers={customers} cars={cars} loading={rentalsLoading} error={rentalsError} query={query}
          onRefresh={() => Promise.all([loadRentals(), loadCars(), loadCustomers()])}
          onCreate={openCreateRental} onStatusChange={updateRentalStatus} statusSaving={rentalStatusSaving}
        />}
        {customerModalOpen && <CustomerModal
          form={customerForm} setForm={setCustomerForm} editingCustomer={editingCustomer}
          saving={customerSaving} onClose={() => setCustomerModalOpen(false)} onSubmit={saveCustomer}
        />}
        {rentalModalOpen && <RentalModal
          form={rentalForm} setForm={setRentalForm} customers={customers}
          cars={cars.filter((car) => (car.status || '').toUpperCase() === 'AVAILABLE')}
          saving={rentalSaving} onClose={() => setRentalModalOpen(false)} onSubmit={createRental}
        />}
      </main>

      {modalOpen && <VehicleModal form={form} setForm={setForm} editingCar={editingCar} saving={saving} onClose={() => setModalOpen(false)} onSubmit={saveCar} />}
      {toast && <div role="status" className="toast-message"><CircleCheck size={17} /><span>{toast}</span><button onClick={() => setToast('')} aria-label="Dismiss message"><X size={15} /></button></div>}
    </div>
  );
}

function StatCard({ icon, iconClass, label, value, note, trend }) {
  return <article className="stat-card"><div className="stat-top"><div className={`stat-icon ${iconClass}`}>{icon}</div><span className="stat-kebab"><MoreHorizontal size={17} /></span></div><div className="stat-label">{label}</div><div className="stat-value">{value}</div><div className="stat-bottom"><span>{note}</span>{trend}</div></article>;
}

function LegendRow({ color, label, value }) {
  return <div className="legend-row"><span className={`legend-dot ${color}`} /><span className="legend-label">{label}</span><strong>{value}</strong></div>;
}

function VehicleTable({ cars, loading, onEdit, onDelete, onAdd }) {
  if (loading) return <div className="table-state"><LoaderCircle className="spin" size={22} /><span>Loading vehicle inventory...</span></div>;
  if (!cars.length) return <div className="empty-state"><div className="empty-icon"><CarFront size={25} /></div><h3>No vehicles to show</h3><p>Add a vehicle to start building your fleet inventory.</p><button className="button button-primary" onClick={onAdd}><Plus size={16} /> Add your first vehicle</button></div>;
  return <div className="table-scroll"><table className="vehicle-table"><thead><tr><th>VEHICLE</th><th>REGISTRATION</th><th>FUEL TYPE</th><th>DAILY RATE</th><th>STATUS</th><th aria-label="Actions" /></tr></thead><tbody>{cars.map((car) => <tr key={car.id}><td><div className="vehicle-cell"><img className="vehicle-thumb" src={vehicleImage(car, Number(car.id || 0))} alt={`Illustrative ${car.brand} ${car.model}`} loading="lazy" onError={(event) => { event.currentTarget.onerror = null; event.currentTarget.src = '/images/car-hatchback.jpg'; }} /><div><strong>{car.brand} {car.model}</strong><span>Vehicle ID #{car.id}</span></div></div></td><td><span className="plate-number">{car.registrationNumber || '—'}</span></td><td><span className="fuel-type"><Fuel size={14} />{car.fuelType || 'Not set'}</span></td><td><strong className="rate-value">{currency(car.rentalPrice)}<span>/day</span></strong></td><td><span className={`status-badge ${statusClass(car.status)}`}><span />{statusLabel(car.status)}</span></td><td><div className="row-actions"><button className="table-action" title="Edit vehicle" aria-label={`Edit ${car.brand} ${car.model}`} onClick={() => onEdit(car)}><Pencil size={15} /></button><button className="table-action delete-action" title="Delete vehicle" aria-label={`Delete ${car.brand} ${car.model}`} onClick={() => onDelete(car)}><Trash2 size={15} /></button></div></td></tr>)}</tbody></table></div>;
}

function ApiNotice({ message, onRetry }) {
  return <div className="api-notice"><div className="api-notice-icon"><AlertCircle size={18} /></div><div><strong>Could not connect to the car API</strong><p>{message}</p><span>Make sure the Spring Boot application is running on port 8081 and the demo profile is enabled.</span></div><button className="button button-secondary" onClick={onRetry}><RefreshCw size={15} /> Retry</button></div>;
}

function VehicleModal({ form, setForm, editingCar, saving, onClose, onSubmit }) {
  const update = (field) => (event) => setForm((current) => ({ ...current, [field]: event.target.value }));
  useEffect(() => {
    function onKey(event) { if (event.key === 'Escape') onClose(); }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);
  return <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}><section className="vehicle-modal" role="dialog" aria-modal="true" aria-labelledby="modal-title"><div className="modal-heading"><div><div className="eyebrow"><span className="eyebrow-dot" /> VEHICLE DETAILS</div><h2 id="modal-title">{editingCar ? 'Edit vehicle' : 'Add a vehicle'}</h2><p>{editingCar ? 'Update the vehicle information below.' : 'Add a vehicle to your rental fleet.'}</p></div><button className="icon-button modal-close" onClick={onClose} aria-label="Close dialog"><X size={19} /></button></div><form onSubmit={onSubmit}><div className="form-grid"><label className="form-field"><span>Brand <em>*</em></span><input autoFocus required maxLength="80" value={form.brand} onChange={update('brand')} placeholder="e.g. Hyundai" /></label><label className="form-field"><span>Model <em>*</em></span><input required maxLength="80" value={form.model} onChange={update('model')} placeholder="e.g. Creta" /></label><label className="form-field form-field-wide"><span>Registration number <em>*</em></span><input required maxLength="24" value={form.registrationNumber} onChange={update('registrationNumber')} placeholder="e.g. MH 02 AB 1234" /></label><label className="form-field"><span>Fuel type</span><select value={form.fuelType} onChange={update('fuelType')}><option>Petrol</option><option>Diesel</option><option>Electric</option><option>Hybrid</option><option>CNG</option></select></label><label className="form-field"><span>Daily rental rate (₹) <em>*</em></span><input required min="0" step="1" type="number" value={form.rentalPrice} onChange={update('rentalPrice')} placeholder="e.g. 2500" /></label><label className="form-field form-field-wide"><span>Availability status</span><select value={form.status} onChange={update('status')}><option value="AVAILABLE">Available</option><option value="BOOKED">Booked</option><option value="ACTIVE">On rent / active</option><option value="MAINTENANCE">Maintenance</option></select></label></div><div className="modal-footer"><span className="required-note"><em>*</em> Required fields</span><div><button type="button" className="button button-secondary" onClick={onClose}>Cancel</button><button type="submit" className="button button-primary" disabled={saving}>{saving ? <LoaderCircle size={16} className="spin" /> : <Check size={16} />}{saving ? 'Saving...' : editingCar ? 'Save changes' : 'Add vehicle'}</button></div></div></form></section></div>;
}

function CustomersPage({ customers, loading, error, query, onRefresh, onCreate, onEdit, onDelete }) {
  const normalizedQuery = query.trim().toLowerCase();
  const filtered = customers.filter((customer) => [customer.fullName, customer.email, customer.phone, customer.licenseNumber]
    .filter(Boolean).join(' ').toLowerCase().includes(normalizedQuery));
  return <div className="page-content">
    <div className="page-heading heading-with-actions"><div><div className="eyebrow"><span className="eyebrow-dot" /> CUSTOMER RELATIONSHIPS</div><h1>Customers</h1><p className="page-subtitle">Keep customer contact and driving-licence details in one place.</p></div><div className="heading-actions"><button className="button button-secondary" onClick={onRefresh} disabled={loading}><RefreshCw size={16} className={loading ? 'spin' : ''} /> Refresh</button><button className="button button-primary" onClick={onCreate}><Plus size={17} /> Add customer</button></div></div>
    {error && <ApiNotice message={error} onRetry={onRefresh} />}
    <section className="stats-grid customer-stats"><StatCard icon={<Users size={19} />} iconClass="purple" label="Total customers" value={loading ? '—' : customers.length} note="Registered records" trend={<span className="stat-neutral"><Activity size={13} /> Customer directory</span>} /><StatCard icon={<CircleCheck size={19} />} iconClass="green" label="With email" value={customers.filter((customer) => customer.email).length} note="Contactable by email" trend={<span className="stat-good">Contact details</span>} /><StatCard icon={<Phone size={19} />} iconClass="blue" label="With phone" value={customers.filter((customer) => customer.phone).length} note="Phone records" trend={<span className="stat-neutral">Reach customers</span>} /><StatCard icon={<ShieldCheck size={19} />} iconClass="amber" label="Licence records" value={customers.filter((customer) => customer.licenseNumber).length} note="Driving licence saved" trend={<span className="stat-neutral">Rental readiness</span>} /></section>
    <section className="panel full-inventory-panel"><div className="inventory-toolbar"><div className="inventory-total"><strong>Customer directory</strong><span>{filtered.length} record{filtered.length === 1 ? '' : 's'}</span></div><span className="rental-availability"><Search size={15} /> Search using the top bar</span></div>
      {loading ? <div className="table-state"><LoaderCircle className="spin" size={22} /><span>Loading customers...</span></div> : filtered.length === 0 ? <div className="empty-state"><div className="empty-icon"><Users size={25} /></div><h3>{customers.length ? 'No matching customers' : 'No customers yet'}</h3><p>{customers.length ? 'Try another search term.' : 'Add a customer before creating a rental.'}</p>{!customers.length && <button className="button button-primary" onClick={onCreate}><Plus size={16} /> Add first customer</button>}</div> :
      <div className="table-scroll"><table className="vehicle-table feature-table"><thead><tr><th>CUSTOMER</th><th>PHONE</th><th>EMAIL</th><th>DRIVING LICENCE</th><th>ADDRESS</th><th aria-label="Actions" /></tr></thead><tbody>{filtered.map((customer) => <tr key={customer.id}><td><div className="vehicle-cell"><div className="customer-avatar">{(customer.fullName || '?').trim().split(/\s+/).slice(0, 2).map((part) => part[0]).join('').toUpperCase()}</div><div><strong>{customer.fullName}</strong><span>Customer ID #{customer.id}</span></div></div></td><td>{customer.phone || '—'}</td><td>{customer.email || '—'}</td><td><span className="plate-number">{customer.licenseNumber || '—'}</span></td><td className="address-cell">{customer.address || '—'}</td><td><div className="row-actions"><button className="table-action" title="Edit customer" aria-label={`Edit ${customer.fullName}`} onClick={() => onEdit(customer)}><Pencil size={15} /></button><button className="table-action delete-action" title="Delete customer" aria-label={`Delete ${customer.fullName}`} onClick={() => onDelete(customer)}><Trash2 size={15} /></button></div></td></tr>)}</tbody></table></div>}
    </section>
    <div className="bottom-note"><div className="note-symbol"><ShieldCheck size={16} /></div><div><strong>Customer records are saved</strong><span>Customers are stored in the Spring Boot database and can be assigned to rentals.</span></div><span className={`connection-pill ${error ? 'offline' : loading ? 'loading' : 'online'}`}><span />{error ? 'API unavailable' : loading ? 'Connecting' : 'API connected'}</span></div>
  </div>;
}

function RentalsPage({ rentals, customers, cars, loading, error, query, onRefresh, onCreate, onStatusChange, statusSaving }) {
  const normalizedQuery = query.trim().toLowerCase();
  const filtered = rentals.filter((rental) => [rental.customerName, rental.vehicleName, rental.registrationNumber, rental.status, rental.startDate, rental.endDate]
    .filter(Boolean).join(' ').toLowerCase().includes(normalizedQuery));
  const active = rentals.filter((rental) => ['RESERVED', 'BOOKED', 'ACTIVE'].includes(String(rental.status).toUpperCase())).length;
  const completed = rentals.filter((rental) => String(rental.status).toUpperCase() === 'COMPLETED').length;
  const revenue = rentals.filter((rental) => ['COMPLETED', 'ACTIVE'].includes(String(rental.status).toUpperCase())).reduce((sum, rental) => sum + Number(rental.totalPrice || 0), 0);
  const available = cars.filter((car) => String(car.status || '').toUpperCase() === 'AVAILABLE').length;
  const canCreate = customers.length > 0 && available > 0;
  return <div className="page-content">
    <div className="page-heading heading-with-actions"><div><div className="eyebrow"><span className="eyebrow-dot" /> RENTAL OPERATIONS</div><h1>Rentals</h1><p className="page-subtitle">Create a rental, track its lifecycle, and keep vehicle availability in sync.</p></div><div className="heading-actions"><button className="button button-secondary" onClick={onRefresh} disabled={loading}><RefreshCw size={16} className={loading ? 'spin' : ''} /> Refresh</button><button className="button button-primary" onClick={onCreate} disabled={!canCreate}><Plus size={17} /> New rental</button></div></div>
    {error && <ApiNotice message={error} onRetry={onRefresh} />}
    {!customers.length && !loading && <div className="workflow-hint"><Users size={17} /><span>Add at least one customer before creating a rental.</span></div>}
    {customers.length > 0 && available === 0 && <div className="workflow-hint"><AlertCircle size={17} /><span>No vehicles are currently available. Mark a vehicle available or complete/cancel an existing rental.</span></div>}
    <section className="stats-grid"><StatCard icon={<CalendarDays size={19} />} iconClass="purple" label="Total rentals" value={loading ? '—' : rentals.length} note="All rental records" trend={<span className="stat-neutral">Rental history</span>} /><StatCard icon={<Clock3 size={19} />} iconClass="amber" label="Open rentals" value={loading ? '—' : active} note="Reserved or currently out" trend={<span className="stat-neutral">Needs tracking</span>} /><StatCard icon={<CircleCheck size={19} />} iconClass="green" label="Completed" value={loading ? '—' : completed} note="Returned rentals" trend={<span className="stat-good">Closed records</span>} /><StatCard icon={<Wallet size={19} />} iconClass="blue" label="Tracked value" value={loading ? '—' : currency(revenue)} note="Active + completed rentals" trend={<span className="stat-neutral">Rental value</span>} /></section>
    <section className="panel full-inventory-panel"><div className="inventory-toolbar"><div className="inventory-total"><strong>Rental register</strong><span>{filtered.length} record{filtered.length === 1 ? '' : 's'}</span></div><span className="rental-availability"><CarFront size={15} /> {available} vehicle{available === 1 ? '' : 's'} available</span></div>
      {loading ? <div className="table-state"><LoaderCircle className="spin" size={22} /><span>Loading rentals...</span></div> : filtered.length === 0 ? <div className="empty-state"><div className="empty-icon"><CalendarDays size={25} /></div><h3>{rentals.length ? 'No matching rentals' : 'No rentals yet'}</h3><p>{rentals.length ? 'Try another search term.' : 'Create a rental to connect a customer with an available vehicle.'}</p>{canCreate && <button className="button button-primary" onClick={onCreate}><Plus size={16} /> Create first rental</button>}</div> :
      <div className="table-scroll"><table className="vehicle-table feature-table rental-table"><thead><tr><th>RENTAL</th><th>CUSTOMER</th><th>VEHICLE</th><th>RENTAL PERIOD</th><th>TOTAL</th><th>STATUS</th></tr></thead><tbody>{filtered.map((rental) => <tr key={rental.id}><td><div className="rental-id">#{rental.id}</div><span className="rental-subtext">Rental record</span></td><td><strong>{rental.customerName || `Customer #${rental.customerId}`}</strong></td><td><strong>{rental.vehicleName || `Vehicle #${rental.carId}`}</strong><span className="rental-subtext">{rental.registrationNumber || ''}</span></td><td><div className="date-range">{rental.startDate} <span>→</span> {rental.endDate}</div><span className="rental-subtext">{Math.max(1, Math.round((new Date(`${rental.endDate}T00:00:00`) - new Date(`${rental.startDate}T00:00:00`)) / 86400000))} day(s)</span></td><td><strong className="rate-value">{currency(rental.totalPrice)}</strong><span className="rental-subtext">{currency(rental.dailyRate)}/day</span></td><td><div className="rental-status-cell"><span className={`status-badge ${rentalStatusClass(rental.status)}`}><span />{rentalStatusLabel(rental.status)}</span><select className="rental-status-select" aria-label={`Change status for rental ${rental.id}`} value={rentalStatusValue(rental.status)} disabled={statusSaving === rental.id} onChange={(event) => onStatusChange(rental, event.target.value)}>{rentalStatusOptions(rental.status).map((option) => <option key={option} value={option}>{rentalStatusLabel(option)}</option>)}</select></div></td></tr>)}</tbody></table></div>}
    </section>
    <div className="bottom-note"><div className="note-symbol"><ShieldCheck size={16} /></div><div><strong>Rental workflow is connected</strong><span>Creating or closing a rental updates the associated vehicle status through the Spring Boot API.</span></div><span className={`connection-pill ${error ? 'offline' : loading ? 'loading' : 'online'}`}><span />{error ? 'API unavailable' : loading ? 'Connecting' : 'API connected'}</span></div>
  </div>;
}

function CustomerModal({ form, setForm, editingCustomer, saving, onClose, onSubmit }) {
  const update = (field) => (event) => setForm((current) => ({ ...current, [field]: event.target.value }));
  return <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}><section className="vehicle-modal" role="dialog" aria-modal="true" aria-labelledby="customer-modal-title"><div className="modal-heading"><div><div className="eyebrow"><span className="eyebrow-dot" /> CUSTOMER DETAILS</div><h2 id="customer-modal-title">{editingCustomer ? 'Edit customer' : 'Add a customer'}</h2><p>Store the customer's contact and driving-licence details.</p></div><button className="icon-button modal-close" onClick={onClose} aria-label="Close dialog"><X size={19} /></button></div><form onSubmit={onSubmit}><div className="form-grid"><label className="form-field form-field-wide"><span>Full name <em>*</em></span><input autoFocus required maxLength="120" value={form.fullName} onChange={update('fullName')} placeholder="e.g. Aarav Patel" /></label><label className="form-field"><span>Email</span><input type="email" maxLength="180" value={form.email} onChange={update('email')} placeholder="name@example.com" /></label><label className="form-field"><span>Phone number <em>*</em></span><input required type="tel" maxLength="24" value={form.phone} onChange={update('phone')} placeholder="e.g. 9876543210" /></label><label className="form-field form-field-wide"><span>Driving licence number <em>*</em></span><input required maxLength="40" value={form.licenseNumber} onChange={update('licenseNumber')} placeholder="Enter licence number" /></label><label className="form-field form-field-wide"><span>Address</span><input maxLength="300" value={form.address} onChange={update('address')} placeholder="City, state (optional)" /></label></div><div className="modal-footer"><span className="required-note"><em>*</em> Required fields</span><div><button type="button" className="button button-secondary" onClick={onClose}>Cancel</button><button type="submit" className="button button-primary" disabled={saving}>{saving ? <LoaderCircle size={16} className="spin" /> : <Check size={16} />}{saving ? 'Saving...' : editingCustomer ? 'Save changes' : 'Add customer'}</button></div></div></form></section></div>;
}

function RentalModal({ form, setForm, customers, cars, saving, onClose, onSubmit }) {
  const update = (field) => (event) => setForm((current) => ({ ...current, [field]: event.target.value }));
  const selectedCar = cars.find((car) => String(car.id) === String(form.carId));
  const start = new Date(`${form.startDate}T00:00:00`);
  const end = new Date(`${form.endDate}T00:00:00`);
  const days = Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) ? 0 : Math.max(1, Math.round((end - start) / 86400000));
  const estimatedTotal = days > 0 && selectedCar ? days * Number(selectedCar.rentalPrice || 0) : 0;
  return <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}><section className="vehicle-modal" role="dialog" aria-modal="true" aria-labelledby="rental-modal-title"><div className="modal-heading"><div><div className="eyebrow"><span className="eyebrow-dot" /> NEW RENTAL</div><h2 id="rental-modal-title">Create a rental</h2><p>Select a customer, available vehicle, and rental dates.</p></div><button className="icon-button modal-close" onClick={onClose} aria-label="Close dialog"><X size={19} /></button></div><form onSubmit={onSubmit}><div className="form-grid"><label className="form-field form-field-wide"><span>Customer <em>*</em></span><select required value={form.customerId} onChange={update('customerId')}><option value="">Select a customer</option>{customers.map((customer) => <option key={customer.id} value={customer.id}>{customer.fullName} — {customer.phone}</option>)}</select></label><label className="form-field form-field-wide"><span>Available vehicle <em>*</em></span><select required value={form.carId} onChange={update('carId')}><option value="">Select a vehicle</option>{cars.map((car) => <option key={car.id} value={car.id}>{car.brand} {car.model} · {car.registrationNumber} · {currency(car.rentalPrice)}/day</option>)}</select></label><label className="form-field"><span>Start date <em>*</em></span><input type="date" required min={localDate()} value={form.startDate} onChange={update('startDate')} /></label><label className="form-field"><span>End date <em>*</em></span><input type="date" required min={form.startDate || localDate()} value={form.endDate} onChange={update('endDate')} /></label>{form.startDate && form.endDate && form.startDate < localDate() ? <div className="rental-date-warning form-field-wide"><AlertCircle size={14} /> Start date cannot be in the past.</div> : form.startDate && form.endDate && form.endDate < form.startDate ? <div className="rental-date-warning form-field-wide"><AlertCircle size={14} /> Return date must be on or after the start date.</div> : null}<label className="form-field form-field-wide"><span>Notes</span><input maxLength="500" value={form.notes} onChange={update('notes')} placeholder="Optional notes for this rental" /></label></div><div className="rental-estimate"><div><span>Daily rate</span><strong>{selectedCar ? currency(selectedCar.rentalPrice) : '—'}</strong></div><div><span>Estimated duration</span><strong>{days > 0 ? `${days} day(s)` : 'Check dates'}</strong></div><div><span>Estimated total</span><strong>{currency(estimatedTotal)}</strong></div></div><div className="modal-footer"><span className="required-note">Vehicle is reserved when saved.</span><div><button type="button" className="button button-secondary" onClick={onClose}>Cancel</button><button type="submit" className="button button-primary" disabled={saving || !customers.length || !cars.length || !form.customerId || !form.carId || !form.startDate || !form.endDate || form.startDate < localDate() || form.endDate < form.startDate}>{saving ? <LoaderCircle size={16} className="spin" /> : <Check size={16} />}{saving ? 'Creating...' : 'Create rental'}</button></div></div></form></section></div>;
}

function rentalStatusValue(status) {
  const normalized = String(status || 'RESERVED').toUpperCase();
  return normalized === 'BOOKED' ? 'RESERVED' : normalized;
}
function rentalStatusOptions(status) {
  const current = rentalStatusValue(status);
  const transitions = {
    RESERVED: ['RESERVED', 'ACTIVE', 'CANCELLED'],
    ACTIVE: ['ACTIVE', 'COMPLETED'],
    COMPLETED: ['COMPLETED'],
    CANCELLED: ['CANCELLED'],
  };
  return transitions[current] || [current];
}
function rentalStatusLabel(status) {
  const normalized = String(status || 'RESERVED').toUpperCase();
  return ({ RESERVED: 'Reserved', BOOKED: 'Reserved', ACTIVE: 'Active', COMPLETED: 'Completed', CANCELLED: 'Cancelled' })[normalized] || statusLabel(normalized);
}
function rentalStatusClass(status) {
  const normalized = String(status || '').toUpperCase();
  if (normalized === 'RESERVED' || normalized === 'BOOKED') return 'booked';
  if (normalized === 'ACTIVE') return 'rented';
  if (normalized === 'COMPLETED') return 'available';
  return 'neutral';
}

createRoot(document.getElementById('root')).render(<React.StrictMode><App /></React.StrictMode>);
