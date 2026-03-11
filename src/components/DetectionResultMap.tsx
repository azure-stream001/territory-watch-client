"use client";

import { useMemo, useEffect, useRef } from "react";
import {
  MapContainer,
  TileLayer,
  Polygon,
  GeoJSON,
  ImageOverlay,
  Pane,
  useMap,
  useMapEvents,
} from "react-leaflet";
import "leaflet/dist/leaflet.css";
import { wktToRings } from "@/lib/geo";
import type { LatLng } from "@/lib/geo";

/** Leaflet wants [lat, lng]; our WKT ring is [lon, lat] */
function ringToLeafletPositions(ring: LatLng[]): [number, number][] {
  return ring.map(([lon, lat]) => [lat, lon]);
}

/** API returns FeatureCollection with geometry: unknown; Leaflet expects strict Geometry. */
type FeatureCollectionLike =
  | { type: "FeatureCollection"; features?: Array<{ type?: string; geometry?: unknown; properties?: unknown }> }
  | null
  | undefined;

/** Bounds as [south, west, north, east] → Leaflet [[south, west], [north, east]] */
function boundsToLeaflet(
  b: [number, number, number, number]
): [[number, number], [number, number]] {
  return [[b[0], b[1]], [b[2], b[3]]];
}

interface DetectionResultMapProps {
  center: [number, number];
  zoom?: number;
  footprintWkt?: string | null;
  /** GeoJSON FeatureCollection (e.g. deforestation patches). Accepts API shape or strict GeoJSON. */
  geojson?: FeatureCollectionLike;
  /** Processed satellite image URL (e.g. result_map_image_url). When set, shown as overlay. */
  imageUrl?: string | null;
  /** [south, west, north, east] for ImageOverlay. Required when imageUrl is set. */
  imageBounds?: [number, number, number, number] | null;
  /** Tile URL template for scene imagery (e.g. /media/scene_previews/1/tiles/{z}/{x}/{y}.png). When set, correct imagery is shown on zoom/pan. */
  tilesUrl?: string | null;
  /** When set, map view is synced: parent controls center/zoom and this map reports changes. */
  onViewChange?: (center: [number, number], zoom: number) => void;
  /** When true, skip initial fit to footprint (e.g. when parent manages view for synced maps). */
  skipFitBounds?: boolean;
  /** When false, the footprint polygon and GeoJSON overlays are hidden. Defaults to true. */
  showFootprint?: boolean;
  className?: string;
}

function FitBounds({
  footprintWkt,
  skipFitBounds,
}: {
  footprintWkt?: string | null;
  skipFitBounds?: boolean;
}) {
  const map = useMap();
  const rings = useMemo(() => (footprintWkt ? wktToRings(footprintWkt) : null), [footprintWkt]);
  useEffect(() => {
    if (skipFitBounds || !rings || rings.length === 0) return;
    const allPositions = rings.flatMap((ring) => ringToLeafletPositions(ring));
    if (allPositions.length < 2) return;
    map.fitBounds(allPositions as [number, number][], { padding: [24, 24], maxZoom: 14 });
  }, [map, rings, skipFitBounds]);
  return null;
}

/** When satellite image is shown, fit map to image bounds so the imagery fills the view. */
function FitBoundsToImage({
  imageBounds,
  skipFitBounds,
}: {
  imageBounds?: [number, number, number, number] | null;
  skipFitBounds?: boolean;
}) {
  const map = useMap();
  useEffect(() => {
    if (skipFitBounds || !imageBounds || imageBounds.length !== 4) return;
    const [[south, west], [north, east]] = boundsToLeaflet(imageBounds);
    map.fitBounds(
      [
        [south, west],
        [north, east],
      ],
      { padding: [20, 20], maxZoom: 16 }
    );
  }, [map, imageBounds, skipFitBounds]);
  return null;
}

function SyncView({
  center,
  zoom,
  enabled,
}: {
  center: [number, number];
  zoom: number;
  enabled: boolean;
}) {
  const map = useMap();
  useEffect(() => {
    if (!enabled) return;
    map.setView(center, zoom, { animate: false });
  }, [map, enabled, center[0], center[1], zoom]);
  return null;
}

function ViewChangeReporter({
  onViewChange,
  center,
  zoom,
}: {
  onViewChange: (center: [number, number], zoom: number) => void;
  center: [number, number];
  zoom: number;
}) {
  const map = useMap();
  const propsRef = useRef({ center, zoom });
  useEffect(() => {
    propsRef.current = { center, zoom };
  }, [center, zoom]);

  useMapEvents({
    moveend: () => {
      const c = map.getCenter();
      const z = map.getZoom();
      const p = propsRef.current;
      const latDiff = Math.abs(c.lat - p.center[0]);
      const lngDiff = Math.abs(c.lng - p.center[1]);
      if (Math.abs(z - p.zoom) > 0.01 || latDiff > 1e-5 || lngDiff > 1e-5) {
        onViewChange([c.lat, c.lng], z);
      }
    },
    zoomend: () => {
      const c = map.getCenter();
      const z = map.getZoom();
      const p = propsRef.current;
      if (Math.abs(z - p.zoom) > 0.01) {
        onViewChange([c.lat, c.lng], z);
      }
    },
  });
  return null;
}

export default function DetectionResultMap({
  center,
  zoom = 12,
  footprintWkt,
  geojson,
  imageUrl,
  imageBounds,
  tilesUrl,
  onViewChange,
  skipFitBounds = false,
  showFootprint = true,
  className = "aspect-video w-full rounded",
}: DetectionResultMapProps) {
  const footprintRings = useMemo(() => {
    const rings = footprintWkt ? wktToRings(footprintWkt) : null;
    return rings ? rings.map((ring) => ringToLeafletPositions(ring)) : null;
  }, [footprintWkt]);

  const showSatelliteImage = Boolean(imageUrl && imageBounds && imageBounds.length === 4);
  const showTiles = Boolean(tilesUrl);

  return (
    <div className={className}>
      <MapContainer
        center={center}
        zoom={zoom}
        className="h-full w-full rounded z-0"
        scrollWheelZoom={true}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {showSatelliteImage && (
          <ImageOverlay
            url={imageUrl as string}
            bounds={boundsToLeaflet(imageBounds!)}
            zIndex={1}
          />
        )}
        {showTiles && (
          <TileLayer
            url={tilesUrl as string}
            zIndex={2}
            tileSize={256}
          />
        )}
        {showFootprint && footprintRings?.map((positions, i) => (
          <Polygon
            key={i}
            positions={positions}
            pathOptions={{ color: "#059669", weight: 2, fillOpacity: 0.15 }}
          />
        ))}
        {geojson?.features?.length ? (
          <Pane name="detection-overlay" style={{ zIndex: 500 }}>
            <GeoJSON
              key={`detection-${geojson.features.length}`}
              data={geojson as GeoJSON.FeatureCollection}
              style={() => ({
                color: "#dc2626",
                weight: 2,
                fillOpacity: 0.2,
              })}
            />
          </Pane>
        ) : null}
        <FitBounds footprintWkt={footprintWkt} skipFitBounds={skipFitBounds || Boolean(onViewChange)} />
        {(showSatelliteImage || showTiles) && imageBounds && imageBounds.length === 4 && (
          <FitBoundsToImage
            imageBounds={imageBounds}
            skipFitBounds={skipFitBounds || Boolean(onViewChange)}
          />
        )}
        {onViewChange && (
          <>
            <SyncView center={center} zoom={zoom} enabled={true} />
            <ViewChangeReporter onViewChange={onViewChange} center={center} zoom={zoom} />
          </>
        )}
      </MapContainer>
    </div>
  );
}
