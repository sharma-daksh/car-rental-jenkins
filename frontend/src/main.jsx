import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import {
  Activity, AlertCircle, ArrowDownRight, ArrowRight, ArrowUpRight,
  Bell, CarFront, Check, ChevronDown, CircleHelp, Clock3, Gauge,
  LayoutDashboard, LoaderCircle, LogOut, Menu, MoreHorizontal,
  Plus, Search, Settings2, ShieldCheck, SlidersHorizontal,
  TrendingUp, Users, Wallet, Wrench, X, CalendarDays, Fuel,
  Pencil, Trash2, RefreshCw, CircleCheck, CircleX, KeyRound,
} from 'lucide-react';
import './styles.css';

const API = '/api/cars';
const EMPTY_FORM = {
  brand: '', model: '', registrationNumber: '', fuelType: 'Petrol',
  rentalPrice: '', status: 'AVAILABLE',
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

function App() {
  const [activePage, setActivePage] = useState('Overview');
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

  useEffect(() => { loadCars(); }, [loadCars]);
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

  const goTo = (page) => {
    setActivePage(page);
    setMobileNavOpen(false);
    if (page === 'Vehicles') setStatusFilter('All vehicles');
  };

  return (
    <div className="app-shell">
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
          <button className={`nav-item ${activePage === 'Overview' ? 'active' : ''}`} onClick={() => goTo('Overview')}><LayoutDashboard size={18} /><span>Overview</span></button>
          <button className={`nav-item ${activePage === 'Vehicles' ? 'active' : ''}`} onClick={() => goTo('Vehicles')}><CarFront size={18} /><span>Vehicles</span><span className="nav-count">{cars.length}</span></button>
          <button className={`nav-item ${activePage === 'Rentals' ? 'active' : ''}`} onClick={() => goTo('Rentals')}><CalendarDays size={18} /><span>Rentals</span><span className="soon-dot" /></button>
          <button className={`nav-item ${activePage === 'Customers' ? 'active' : ''}`} onClick={() => goTo('Customers')}><Users size={18} /><span>Customers</span></button>
        </nav>
        <div className="nav-label nav-label-spaced">MANAGE</div>
        <nav className="main-nav">
          <button className={`nav-item ${activePage === 'Reports' ? 'active' : ''}`} onClick={() => goTo('Reports')}><TrendingUp size={18} /><span>Reports</span></button>
          <button className={`nav-item ${activePage === 'Settings' ? 'active' : ''}`} onClick={() => goTo('Settings')}><Settings2 size={18} /><span>Settings</span></button>
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
            <div className="global-search"><Search size={16} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search vehicles..." aria-label="Search vehicles" /><kbd>⌘ K</kbd></div>
            <button className="icon-button notification-button" aria-label="Notifications" onClick={() => setToast('You are all caught up.')}><Bell size={18} /><span /></button>
            <div className="topbar-divider" />
            <div className="topbar-user"><div className="topbar-avatar">DS</div><ChevronDown size={14} className="muted-icon" /></div>
          </div>
        </header>

        {activePage === 'Overview' && (
          <div className="page-content">
            <div className="page-heading heading-with-actions"><div><div className="eyebrow"><span className="eyebrow-dot" /> FLEET OVERVIEW</div><h1>Your fleet, at a glance.</h1><p className="page-subtitle">Here's what's happening with your vehicles today.</p></div><div className="heading-actions"><button className="button button-secondary" onClick={loadCars} disabled={loading}><RefreshCw size={16} className={loading ? 'spin' : ''} /> Refresh</button><button className="button button-primary" onClick={openCreate}><Plus size={17} /> Add vehicle</button></div></div>
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

        {['Rentals', 'Customers', 'Reports', 'Settings'].includes(activePage) && <ComingSoon page={activePage} onGoVehicles={() => goTo('Vehicles')} />}
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
  return <div className="table-scroll"><table className="vehicle-table"><thead><tr><th>VEHICLE</th><th>REGISTRATION</th><th>FUEL TYPE</th><th>DAILY RATE</th><th>STATUS</th><th aria-label="Actions" /></tr></thead><tbody>{cars.map((car) => <tr key={car.id}><td><div className="vehicle-cell"><div className={`car-tile tile-${(car.fuelType || 'petrol').toLowerCase()}`}><CarFront size={20} /></div><div><strong>{car.brand} {car.model}</strong><span>Vehicle ID #{car.id}</span></div></div></td><td><span className="plate-number">{car.registrationNumber || '—'}</span></td><td><span className="fuel-type"><Fuel size={14} />{car.fuelType || 'Not set'}</span></td><td><strong className="rate-value">{currency(car.rentalPrice)}<span>/day</span></strong></td><td><span className={`status-badge ${statusClass(car.status)}`}><span />{statusLabel(car.status)}</span></td><td><div className="row-actions"><button className="table-action" title="Edit vehicle" aria-label={`Edit ${car.brand} ${car.model}`} onClick={() => onEdit(car)}><Pencil size={15} /></button><button className="table-action delete-action" title="Delete vehicle" aria-label={`Delete ${car.brand} ${car.model}`} onClick={() => onDelete(car)}><Trash2 size={15} /></button></div></td></tr>)}</tbody></table></div>;
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

function ComingSoon({ page, onGoVehicles }) {
  const content = {
    Rentals: { icon: <CalendarDays size={23} />, title: 'Rental management is up next', copy: 'The rental API and rental workflow have not been implemented yet. For now, you can manage your vehicle inventory and confirm the React-to-Spring integration.' },
    Customers: { icon: <Users size={23} />, title: 'Customer management is coming next', copy: 'Customer records and customer accounts will be added when the rental workflow is implemented.' },
    Reports: { icon: <TrendingUp size={23} />, title: 'Fleet reporting is on the roadmap', copy: 'Reporting will use rental and vehicle activity once those workflows are implemented.' },
    Settings: { icon: <Settings2 size={23} />, title: 'Workspace settings', copy: 'Application settings and role-based access will be added in a later project task.' },
  }[page];
  return <div className="coming-page"><div className="coming-card"><div className="coming-icon">{content.icon}</div><span className="coming-eyebrow">ROVE WORKSPACE</span><h1>{content.title}</h1><p>{content.copy}</p><button className="button button-primary" onClick={onGoVehicles}>Go to vehicle inventory <ArrowRight size={16} /></button></div></div>;
}

createRoot(document.getElementById('root')).render(<React.StrictMode><App /></React.StrictMode>);
