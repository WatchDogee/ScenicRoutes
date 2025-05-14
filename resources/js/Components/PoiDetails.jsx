import React from 'react';
import { FaTimes, FaMapMarkerAlt, FaGasPump, FaBolt, FaGlobe, FaPhone, FaClock } from 'react-icons/fa';
export default function PoiDetails({ poi, onClose }) {
    const getPoiIcon = () => {
        switch (poi.type) {
            case 'tourism':
                return <FaMapMarkerAlt className="text-blue-500 text-xl" />;
            case 'fuel':
                return <FaGasPump className="text-red-500 text-xl" />;
            case 'charging':
                return <FaBolt className="text-green-500 text-xl" />;
            default:
                return <FaMapMarkerAlt className="text-gray-500 text-xl" />;
        }
    };
    const formatSubtype = (subtype) => {
        return subtype.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
    };
    if (!poi) return null;
    const properties = poi.properties || {};
    return (
        <div className="poi-details bg-white p-4 rounded-lg shadow-lg border border-gray-200 max-h-[80vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4 sticky top-0 bg-white pb-2 border-b z-10">
                <h3 className="text-xl font-semibold flex items-center">
                    {getPoiIcon()}
                    <span className="ml-2">{poi.name}</span>
                </h3>
                <div className="flex items-center">
                    <button
                        onClick={onClose}
                        className="text-white bg-red-500 hover:bg-red-600 p-2 rounded-md transition-colors flex items-center justify-center"
                        aria-label="Close POI details"
                        title="Close"
                    >
                        <div className="flex items-center">
                            <FaTimes size={16} />
                            <span className="ml-1 text-sm">Close</span>
                        </div>
                    </button>
                </div>
            </div>
            <div className="opacity-100">
                <div className="mb-4">
                    <p className="text-sm text-gray-600">{formatSubtype(poi.subtype)}</p>
                    {poi.description && (
                        <p className="mt-2">{poi.description}</p>
                    )}
                    <div className="mt-3 grid grid-cols-1 gap-2">
                        {properties.website && (
                            <p className="flex items-center">
                                <FaGlobe className="mr-2 text-gray-600" />
                                <a href={properties.website} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">
                                    Website
                                </a>
                            </p>
                        )}
                        {properties.phone && (
                            <p className="flex items-center">
                                <FaPhone className="mr-2 text-gray-600" />
                                {properties.phone}
                            </p>
                        )}
                        {properties.opening_hours && (
                            <p className="flex items-center">
                                <FaClock className="mr-2 text-gray-600" />
                                {properties.opening_hours}
                            </p>
                        )}
                    </div>
                    {$1}
                    {poi.type === 'fuel' && (
                        <div className="mt-3">
                            {properties.brand && <p><strong>Brand:</strong> {properties.brand}</p>}
                            {properties.operator && <p><strong>Operator:</strong> {properties.operator}</p>}
                            {properties.fuel_types && properties.fuel_types.length > 0 && (
                                <div className="mt-2">
                                    <p className="font-semibold">Fuel Types:</p>
                                    <ul className="list-disc list-inside">
                                        {properties.fuel_types.map((type, index) => (
                                            <li key={index}>{formatSubtype(type)}</li>
                                        ))}
                                    </ul>
                                </div>
                            )}
                        </div>
                    )}
                    {poi.type === 'charging' && (
                        <div className="mt-3">
                            {properties.operator && <p><strong>Operator:</strong> {properties.operator}</p>}
                            {properties.network && <p><strong>Network:</strong> {properties.network}</p>}
                            {properties.maxpower && <p><strong>Max Power:</strong> {properties.maxpower}</p>}
                            {properties.fee && <p><strong>Fee:</strong> {properties.fee}</p>}
                            <div className="mt-2">
                                <p className="font-semibold">Connectors:</p>
                                <ul className="list-disc list-inside">
                                    {properties['socket:type2'] && <li>Type 2</li>}
                                    {properties['socket:chademo'] && <li>CHAdeMO</li>}
                                    {properties['socket:ccs'] && <li>CCS</li>}
                                </ul>
                            </div>
                        </div>
                    )}
                </div>
                {$1}
            </div>
        </div>
    );
}
