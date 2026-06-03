'use client';

import React, { useEffect, useState } from 'react';
import { apiRequest } from '../../../lib/api';

interface GoldImageDetails {
  leadId: string;
  leadNumber: string;
  customerName: string;
  id: string;
  imageUrl: string;
  createdAt: string;
}

export default function GalleryPage() {
  const [images, setImages] = useState<GoldImageDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [previewImage, setPreviewImage] = useState<GoldImageDetails | null>(null);

  useEffect(() => {
    async function loadImages() {
      try {
        const data = await apiRequest('/executive/assigned-leads');
        
        const detailedLeads = await Promise.all(
          data.map((lead: any) => 
            apiRequest(`/executive/lead/${lead.id}`).catch(() => null)
          )
        );

        const allImages: GoldImageDetails[] = [];
        detailedLeads.forEach((lead: any) => {
          if (lead) {
            const goldImages = lead.gold_images || lead.goldImages;
            if (goldImages) {
              goldImages.forEach((img: any) => {
                allImages.push({
                  leadId: lead.id,
                  leadNumber: lead.lead_number || lead.leadNumber,
                  customerName: lead.customer_name || lead.customerName,
                  id: img.id,
                  imageUrl: img.image_url || img.imageUrl,
                  createdAt: img.created_at || img.createdAt
                });
              });
            }
          }
        });

        setImages(allImages);
      } catch (err: any) {
        setError(err.message || 'Failed to load gold verification images.');
      } finally {
        setLoading(false);
      }
    }
    loadImages();
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
        <div className="w-10 h-10 rounded-full border-4 border-amber-500/25 border-t-amber-500 animate-spin"></div>
        <p className="text-amber-500/50 text-xs font-mono tracking-wider uppercase">Loading Gold Gallery...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 rounded-2xl bg-red-500/5 border border-red-500/15 max-w-xl mx-auto mt-10 text-center">
        <p className="text-slate-300 font-mono text-sm">{error}</p>
        <button onClick={() => window.location.reload()} className="mt-4 px-4 py-2 bg-amber-500 text-slate-950 font-bold rounded-lg text-xs tracking-wider">
          RETRY
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fadeIn text-slate-800">
      
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">Verification Gallery</h1>
        <p className="text-slate-500 text-sm mt-1">Review visual logs of collected gold articles and valuations.</p>
      </div>

      <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-sm">
        {images.length === 0 ? (
          <div className="p-12 text-center text-slate-400 font-medium text-sm">
            No gold verification images uploaded yet. Upload images during the buyout steps to see them here.
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {images.map((img) => (
              <div 
                key={img.id}
                onClick={() => setPreviewImage(img)}
                className="group relative cursor-pointer aspect-square rounded-xl overflow-hidden border border-slate-200 bg-slate-100 shadow-sm transition-all duration-300 hover:scale-[1.03] hover:border-amber-500/40"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img 
                  src={img.imageUrl} 
                  alt="Gold ornament verification" 
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                />
                
                {/* Overlay details */}
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 p-4 flex flex-col justify-end">
                  <p className="text-xs font-bold text-amber-500 truncate">{img.customerName}</p>
                  <p className="text-[9px] text-slate-400 font-mono">Lead ID: {img.leadNumber || img.leadId.slice(0, 8)}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Lightbox / Preview Modal */}
      {previewImage && (
        <div 
          className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fadeIn"
          onClick={() => setPreviewImage(null)}
        >
          <div 
            className="relative max-w-3xl w-full max-h-[85vh] bg-white border border-slate-200 p-4 rounded-2xl flex flex-col gap-4 text-left shadow-2xl animate-scaleUp"
            onClick={(e) => e.stopPropagation()}
          >
            <button 
              onClick={() => setPreviewImage(null)}
              className="absolute -top-3 -right-3 w-8 h-8 rounded-full bg-[#4d0711] text-white font-bold flex items-center justify-center hover:brightness-110 shadow-lg cursor-pointer border border-[#691823]/25"
            >
              ✕
            </button>
            
            <div className="flex-1 overflow-hidden rounded-xl border border-slate-200 aspect-video relative bg-slate-50">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img 
                src={previewImage.imageUrl} 
                alt="Verification Detail preview" 
                className="w-full h-full object-contain bg-slate-50"
              />
            </div>

            <div className="px-3 font-mono text-xs text-slate-500 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 border-t border-slate-200 pt-2">
              <div>
                <p className="text-sm font-sans font-bold text-slate-800">{previewImage.customerName}</p>
                <p className="text-[10px]">Lead ID: {previewImage.leadNumber || previewImage.leadId.slice(0, 8)}</p>
              </div>
              <p className="text-[10px]">Uploaded on: {previewImage.createdAt ? new Date(previewImage.createdAt).toLocaleDateString() : 'N/A'}</p>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
