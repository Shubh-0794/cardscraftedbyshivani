import React, { useState, useEffect } from 'react';
import {
  APIProvider,
  Map,
  AdvancedMarker,
  Pin,
  InfoWindow,
  useAdvancedMarkerRef
} from '@vis.gl/react-google-maps';
import {
  MapPin,
  Navigation,
  Sparkles,
  Truck,
  Store,
  Compass,
  X,
  ExternalLink,
  Search,
  Layers,
  Key
} from 'lucide-react';

interface GoogleMapsModalProps {
  isOpen: boolean;
  onClose: () => void;
  deliveryLocation?: {
    address: string;
    city: string;
    customerName?: string;
    orderNumber?: string;
  };
}

const API_KEY =
  process.env.GOOGLE_MAPS_PLATFORM_KEY ||
  (import.meta as any).env?.VITE_GOOGLE_MAPS_PLATFORM_KEY ||
  (globalThis as any).GOOGLE_MAPS_PLATFORM_KEY ||
  '';

const hasValidKey = Boolean(API_KEY) && API_KEY !== 'YOUR_API_KEY';

// Default Cards Crafted Studio Coordinates (Mumbai Studio)
const STUDIO_COORDS = { lat: 19.076, lng: 72.8777 };

// Craft Material Supplier Hubs
const SUPPLIER_HUBS = [
  { id: 'sup-1', name: 'Cards Crafted Flagship Studio', type: 'STUDIO', lat: 19.076, lng: 72.8777, address: 'Bandra West, Mumbai' },
  { id: 'sup-2', name: 'Artisan Paper & Cardstock Depot', type: 'SUPPLIER', lat: 19.0178, lng: 72.8478, address: 'Dadar Art District, Mumbai' },
  { id: 'sup-3', name: 'Crystal Resin & Glitter Supplies', type: 'SUPPLIER', lat: 19.1136, lng: 72.8697, address: 'Andheri Craft Lane, Mumbai' },
  { id: 'sup-4', name: 'Lace & Ribbons Craft Warehouse', type: 'SUPPLIER', lat: 18.922, lng: 72.8347, address: 'Colaba Crafts Market, Mumbai' }
];

export const GoogleMapsModal: React.FC<GoogleMapsModalProps> = ({
  isOpen,
  onClose,
  deliveryLocation
}) => {
  const [selectedPin, setSelectedPin] = useState<any>(null);
  const [activeFilter, setActiveFilter] = useState<'ALL' | 'STUDIO' | 'SUPPLIERS' | 'DELIVERY'>('ALL');
  const [mapCenter, setMapCenter] = useState(STUDIO_COORDS);
  const [zoom, setZoom] = useState(12);

  // Simulated geocoded destination based on customer city/address
  const [customerCoords, setCustomerCoords] = useState<{ lat: number; lng: number } | null>(null);

  useEffect(() => {
    if (deliveryLocation?.city) {
      const city = deliveryLocation.city.toLowerCase();
      if (city.includes('pune')) {
        setCustomerCoords({ lat: 18.5204, lng: 73.8567 });
      } else if (city.includes('delhi')) {
        setCustomerCoords({ lat: 28.6139, lng: 77.209 });
      } else if (city.includes('bangalore') || city.includes('bengaluru')) {
        setCustomerCoords({ lat: 12.9716, lng: 77.5946 });
      } else {
        // Default customer delivery offset in Mumbai region
        setCustomerCoords({ lat: 19.055, lng: 72.835 });
      }
    } else {
      setCustomerCoords(null);
    }
  }, [deliveryLocation]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/75 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-700/80 rounded-3xl w-full max-w-5xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden text-slate-100 font-sans">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between bg-slate-900/90 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-500/20 border border-blue-500/40 flex items-center justify-center text-blue-400">
              <MapPin className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-black text-white">Google Maps Delivery & Studio Hub</h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-950 text-blue-300 border border-blue-800">
                  Google Maps Platform
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Studio locations, verified delivery routing, and craft supply supplier networks
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-xl bg-slate-800/80 hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
          {/* Left Panel: Controls & Location Details */}
          <div className="w-full md:w-80 border-b md:border-b-0 md:border-r border-slate-800 p-4 space-y-4 overflow-y-auto shrink-0 bg-slate-900/50">
            {/* Filter Pills */}
            <div>
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-2">
                Map Layers
              </span>
              <div className="grid grid-cols-2 gap-1.5">
                <button
                  type="button"
                  onClick={() => setActiveFilter('ALL')}
                  className={`px-3 py-1.5 text-xs font-bold rounded-xl border transition-colors cursor-pointer text-left ${
                    activeFilter === 'ALL'
                      ? 'bg-blue-600 border-blue-500 text-white'
                      : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700'
                  }`}
                >
                  All Pins
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setActiveFilter('STUDIO');
                    setMapCenter(STUDIO_COORDS);
                    setZoom(14);
                  }}
                  className={`px-3 py-1.5 text-xs font-bold rounded-xl border transition-colors cursor-pointer text-left ${
                    activeFilter === 'STUDIO'
                      ? 'bg-purple-600 border-purple-500 text-white'
                      : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700'
                  }`}
                >
                  Studio Workshop
                </button>
                <button
                  type="button"
                  onClick={() => setActiveFilter('SUPPLIERS')}
                  className={`px-3 py-1.5 text-xs font-bold rounded-xl border transition-colors cursor-pointer text-left ${
                    activeFilter === 'SUPPLIERS'
                      ? 'bg-emerald-600 border-emerald-500 text-white'
                      : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700'
                  }`}
                >
                  Supply Vendors
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setActiveFilter('DELIVERY');
                    if (customerCoords) {
                      setMapCenter(customerCoords);
                      setZoom(13);
                    }
                  }}
                  className={`px-3 py-1.5 text-xs font-bold rounded-xl border transition-colors cursor-pointer text-left ${
                    activeFilter === 'DELIVERY'
                      ? 'bg-amber-600 border-amber-500 text-white'
                      : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700'
                  }`}
                >
                  Delivery Route
                </button>
              </div>
            </div>

            {/* Active Delivery Order Context */}
            {deliveryLocation && (
              <div className="p-3.5 bg-amber-950/30 border border-amber-800/60 rounded-2xl space-y-2">
                <div className="flex items-center gap-2 text-amber-400 font-bold text-xs">
                  <Truck className="w-4 h-4" />
                  <span>Delivery Order #{deliveryLocation.orderNumber || 'ORD-1001'}</span>
                </div>
                <div className="text-xs space-y-1">
                  <p className="font-semibold text-white">{deliveryLocation.customerName || 'Customer'}</p>
                  <p className="text-slate-300 text-[11px] leading-snug">
                    {deliveryLocation.address}, {deliveryLocation.city}
                  </p>
                </div>
                <div className="pt-1 flex items-center justify-between text-[10px] text-amber-300/80 font-mono">
                  <span>Transit: ~35 mins</span>
                  <span>Direct Courier</span>
                </div>
              </div>
            )}

            {/* Location List */}
            <div className="space-y-2">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                Craft Network Locations
              </span>
              {SUPPLIER_HUBS.map(loc => (
                <div
                  key={loc.id}
                  onClick={() => {
                    setMapCenter({ lat: loc.lat, lng: loc.lng });
                    setZoom(14);
                    setSelectedPin(loc);
                  }}
                  className={`p-2.5 rounded-xl border transition-all cursor-pointer ${
                    selectedPin?.id === loc.id
                      ? 'bg-slate-800 border-blue-500'
                      : 'bg-slate-800/50 border-slate-700/60 hover:border-slate-600'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    {loc.type === 'STUDIO' ? (
                      <Store className="w-4 h-4 text-purple-400 shrink-0" />
                    ) : (
                      <MapPin className="w-4 h-4 text-emerald-400 shrink-0" />
                    )}
                    <span className="font-bold text-xs text-white line-clamp-1">{loc.name}</span>
                  </div>
                  <p className="text-[10px] text-slate-400 mt-0.5 pl-6">{loc.address}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Right Panel: The Map Canvas with Fallback Splash Screen */}
          <div className="flex-1 h-96 md:h-auto min-h-[420px] relative bg-slate-950 flex flex-col items-center justify-center">
            {!hasValidKey ? (
              // Mandatory Google Maps Platform Splash Screen as required by Constitution Rule 1.C
              <div className="p-6 text-center max-w-lg space-y-4">
                <div className="w-14 h-14 rounded-3xl bg-blue-500/10 border border-blue-500/30 flex items-center justify-center text-blue-400 mx-auto shadow-inner">
                  <MapPin className="w-7 h-7" />
                </div>
                <h3 className="text-base sm:text-lg font-black text-white">Google Maps API Key Required</h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  To view live interactive vector maps, place geocoding, and transit routing, configure your Google
                  Maps API key:
                </p>

                <div className="p-4 bg-slate-900 border border-slate-800 rounded-2xl text-left text-xs text-slate-300 space-y-2.5">
                  <div className="flex items-start gap-2">
                    <span className="w-5 h-5 rounded-full bg-blue-600 text-white font-bold flex items-center justify-center text-[10px] shrink-0 mt-0.5">
                      1
                    </span>
                    <div>
                      <a
                        href="https://console.cloud.google.com/google/maps-apis/start?utm_campaign=gmp-code-assist-ais"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-400 hover:text-blue-300 font-bold flex items-center gap-1 inline-flex"
                      >
                        <span>Get a Google Maps API Key</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                  </div>

                  <div className="flex items-start gap-2">
                    <span className="w-5 h-5 rounded-full bg-blue-600 text-white font-bold flex items-center justify-center text-[10px] shrink-0 mt-0.5">
                      2
                    </span>
                    <div>
                      Open <strong>Settings</strong> (⚙️ gear icon, top-right) &rarr; <strong>Secrets</strong> &rarr; Add{' '}
                      <code className="bg-slate-950 px-1.5 py-0.5 rounded text-amber-300 font-mono">
                        GOOGLE_MAPS_PLATFORM_KEY
                      </code>
                    </div>
                  </div>
                </div>

                <p className="text-[11px] text-slate-500 italic">
                  The application rebuilds automatically once the secret key is provided.
                </p>
              </div>
            ) : (
              <APIProvider apiKey={API_KEY} version="weekly">
                <Map
                  center={mapCenter}
                  zoom={zoom}
                  mapId="CARDS_CRAFTED_MAP_ID"
                  internalUsageAttributionIds={['gmp_mcp_codeassist_v1_aistudio']}
                  style={{ width: '100%', height: '100%' }}
                >
                  {/* Studio Headquarters Marker */}
                  {(activeFilter === 'ALL' || activeFilter === 'STUDIO') && (
                    <AdvancedMarker
                      position={STUDIO_COORDS}
                      title="Cards Crafted Flagship Studio"
                      onClick={() => setSelectedPin(SUPPLIER_HUBS[0])}
                    >
                      <Pin background="#9333ea" glyphColor="#ffffff" borderColor="#581c87" />
                    </AdvancedMarker>
                  )}

                  {/* Supplier Hub Markers */}
                  {(activeFilter === 'ALL' || activeFilter === 'SUPPLIERS') &&
                    SUPPLIER_HUBS.slice(1).map(sup => (
                      <AdvancedMarker
                        key={sup.id}
                        position={{ lat: sup.lat, lng: sup.lng }}
                        title={sup.name}
                        onClick={() => setSelectedPin(sup)}
                      >
                        <Pin background="#10b981" glyphColor="#ffffff" borderColor="#065f46" />
                      </AdvancedMarker>
                    ))}

                  {/* Customer Delivery Marker */}
                  {customerCoords && (activeFilter === 'ALL' || activeFilter === 'DELIVERY') && (
                    <AdvancedMarker
                      position={customerCoords}
                      title={`Delivery: ${deliveryLocation?.customerName || 'Customer'}`}
                      onClick={() =>
                        setSelectedPin({
                          name: `Customer Delivery: ${deliveryLocation?.customerName || 'Order Destination'}`,
                          address: `${deliveryLocation?.address}, ${deliveryLocation?.city}`,
                          type: 'DELIVERY'
                        })
                      }
                    >
                      <Pin background="#f59e0b" glyphColor="#000000" borderColor="#78350f" />
                    </AdvancedMarker>
                  )}
                </Map>
              </APIProvider>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-3.5 bg-slate-900 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400 shrink-0">
          <span>Cards Crafted Studio &bull; Google Maps Platform Integration</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold rounded-xl transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
