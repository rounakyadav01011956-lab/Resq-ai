import React, { useState, useRef } from 'react'
import {
  Upload,
  CheckCircle2,
  AlertCircle,
  FileCode,
  HelpCircle
} from 'lucide-react'
import { uploadGeoJSON } from '../services/api'
import type { GeoJSONValidationResponse } from '../types/simulation'

interface GeoJSONUploadModalProps {
  isOpen: boolean
  onClose: () => void
  onLoadSuccess: (response: GeoJSONValidationResponse) => void
}

export const GeoJSONUploadModal: React.FC<GeoJSONUploadModalProps> = ({
  isOpen,
  onClose,
  onLoadSuccess
}) => {
  const [file, setFile] = useState<File | null>(null)
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<GeoJSONValidationResponse | null>(null)
  const [dragActive, setDragActive] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  if (!isOpen) return null

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === 'dragenter' || e.type === 'dragover') setDragActive(true)
    else if (e.type === 'dragleave') setDragActive(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelected(e.dataTransfer.files[0])
    }
  }

  const handleFileSelected = (selectedFile: File) => {
    setFile(selectedFile)
    setResult(null)
  }

  const handleProcessUpload = async () => {
    if (!file) return
    setLoading(true)
    try {
      const res = await uploadGeoJSON(file)
      setResult(res)
      if (res.is_valid) {
        onLoadSuccess(res)
      }
    } catch (err: any) {
      setResult({
        is_valid: false,
        feature_count: 0,
        geometry_distribution: {},
        building_count: 0,
        road_count: 0,
        errors: [err.message || 'Network error processing GeoJSON'],
        warnings: []
      })
    } finally {
      setLoading(false)
    }
  }

  const handleLoadSample = async () => {
    setLoading(true)
    try {
      // Create a mock File from the sample GeoJSON
      const sampleData = {
        type: 'FeatureCollection',
        features: [
          {
            type: 'Feature',
            properties: { id: 'bldg_hosp', name: 'Metropolitan Hospital', building: 'hospital', height: 32 },
            geometry: {
              type: 'Polygon',
              coordinates: [[[-74.008, 40.712], [-74.006, 40.712], [-74.006, 40.7135], [-74.008, 40.7135], [-74.008, 40.712]]]
            }
          },
          {
            type: 'Feature',
            properties: { id: 'bldg_univ', name: 'Science Complex', building: 'civic', height: 22 },
            geometry: {
              type: 'Polygon',
              coordinates: [[[-74.005, 40.712], [-74.003, 40.712], [-74.003, 40.7135], [-74.005, 40.7135], [-74.005, 40.712]]]
            }
          },
          {
            type: 'Feature',
            properties: { id: 'road_main', name: 'Harbor Expressway', highway: 'primary' },
            geometry: {
              type: 'LineString',
              coordinates: [[-74.009, 40.7115], [-74.002, 40.7115]]
            }
          },
          {
            type: 'Feature',
            properties: { id: 'exit_north', name: 'North Stadium Evac Area', emergency: 'assembly_point' },
            geometry: { type: 'Point', coordinates: [-74.0055, 40.7145] }
          }
        ]
      }
      const blob = new Blob([JSON.stringify(sampleData)], { type: 'application/json' })
      const sampleFile = new File([blob], 'sample_evacuation_district.geojson', { type: 'application/json' })
      setFile(sampleFile)
      const res = await uploadGeoJSON(sampleFile)
      setResult(res)
      if (res.is_valid) {
        onLoadSuccess(res)
      }
    } catch (err: any) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-2xl w-full p-6 shadow-2xl overflow-y-auto max-h-[90vh]">
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-cyan-950 border border-cyan-800 rounded-lg text-cyan-400">
              <Upload className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Spatial Map & Blueprint Import</h2>
              <p className="text-xs text-slate-400">
                Upload GeoJSON maps (.geojson, .json) OR Architectural Blueprint Images (.png, .jpg)
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 text-lg cursor-pointer"
          >
            ✕
          </button>
        </div>

        {/* Drag and drop area */}
        <div
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          onClick={() => inputRef.current?.click()}
          className={`border-2 border-dashed rounded-xl p-8 my-5 text-center transition cursor-pointer ${
            dragActive
              ? 'border-cyan-400 bg-cyan-950/20'
              : 'border-slate-700 hover:border-slate-600 bg-slate-950/60'
          }`}
        >
          <input
            ref={inputRef}
            type="file"
            accept=".geojson,.json,.png,.jpg,.jpeg"
            onChange={(e) => e.target.files && handleFileSelected(e.target.files[0])}
            className="hidden"
          />
          <FileCode className="w-10 h-10 text-cyan-400 mx-auto mb-2" />
          <p className="text-sm font-semibold text-slate-200">
            {file ? file.name : 'Drag & drop GeoJSON (.geojson/.json) OR Blueprint Image (.png/.jpg)'}
          </p>
          <p className="text-xs text-slate-400 mt-1">
            {file
              ? file.name.match(/\.(png|jpg|jpeg)$/i)
                ? `🖼️ Blueprint Floor Plan Image (${(file.size / 1024).toFixed(1)} KB) — Walls will be extruded into 3D`
                : `🗺️ GeoJSON Vector Map (${(file.size / 1024).toFixed(1)} KB)`
              : 'Click to browse files from your computer'}
          </p>
        </div>

        {/* Preset Sample Quick Button */}
        <div className="flex items-center justify-between bg-slate-950 border border-slate-800 p-3 rounded-xl mb-4 text-xs">
          <div className="flex items-center gap-2 text-slate-300">
            <HelpCircle className="w-4 h-4 text-cyan-400" />
            <span>Don't have a GeoJSON file ready?</span>
          </div>
          <button
            onClick={handleLoadSample}
            disabled={loading}
            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-cyan-400 border border-slate-700 rounded-lg font-semibold transition cursor-pointer"
          >
            Load Sample District
          </button>
        </div>

        {/* Validation Results Display */}
        {result && (
          <div className="mt-4 p-4 rounded-xl border bg-slate-950/90 text-xs">
            {result.is_valid ? (
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-emerald-400 font-bold text-sm">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>GeoJSON Validated & Loaded Successfully into 3D Engine!</span>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <div className="bg-slate-900 p-2.5 rounded-lg border border-slate-800">
                    <span className="text-slate-400">Total Features:</span>
                    <div className="text-base font-bold text-white mt-0.5">{result.feature_count}</div>
                  </div>
                  <div className="bg-slate-900 p-2.5 rounded-lg border border-slate-800">
                    <span className="text-slate-400">3D Buildings:</span>
                    <div className="text-base font-bold text-cyan-400 mt-0.5">{result.building_count}</div>
                  </div>
                  <div className="bg-slate-900 p-2.5 rounded-lg border border-slate-800">
                    <span className="text-slate-400">Road Segments:</span>
                    <div className="text-base font-bold text-blue-400 mt-0.5">{result.road_count}</div>
                  </div>
                </div>

                {result.warnings.length > 0 && (
                  <div className="bg-amber-950/40 border border-amber-800/60 p-2.5 rounded-lg text-amber-300 space-y-1">
                    <span className="font-semibold">Notice / Auto-corrections:</span>
                    {result.warnings.map((w, idx) => (
                      <div key={idx}>• {w}</div>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-2 text-red-400">
                <div className="flex items-center gap-2 font-bold text-sm">
                  <AlertCircle className="w-4 h-4" />
                  <span>GeoJSON Processing Errors Encountered:</span>
                </div>
                {result.errors.map((err, idx) => (
                  <div key={idx} className="bg-red-950/40 border border-red-900 p-2 rounded">
                    • {err}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Footer Actions */}
        <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-slate-800">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-semibold cursor-pointer"
          >
            Close
          </button>
          <button
            onClick={handleProcessUpload}
            disabled={!file || loading}
            className="flex items-center gap-2 px-5 py-2 bg-cyan-600 hover:bg-cyan-500 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-lg text-xs font-bold transition cursor-pointer shadow-lg shadow-cyan-950"
          >
            {loading ? 'Processing Geometry...' : 'Validate & Render 3D'}
          </button>
        </div>
      </div>
    </div>
  )
}
