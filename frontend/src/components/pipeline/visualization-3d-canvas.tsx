"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import type { VisualizationPoint } from "@/types/analysis";

type Visualization3DCanvasProps = {
  points: VisualizationPoint[];
  activePointId: string | null;
  onActivePointChange: (pointId: string | null) => void;
  colorMap: Record<string, string>;
  useJitter: boolean;
  resetToken: number;
};

type Vec3 = {
  x: number;
  y: number;
  z: number;
};

type ProjectedPoint = {
  point: VisualizationPoint;
  x: number;
  y: number;
  depth: number;
  scale: number;
  color: string;
};

type CameraState = {
  yaw: number;
  pitch: number;
  distance: number;
  target: Vec3;
};

type SceneBounds = {
  center: Vec3;
  radius: number;
  extentX: number;
  extentY: number;
  extentZ: number;
};

const BASE_CAMERA: CameraState = {
  yaw: -0.8,
  pitch: 0.42,
  distance: 4.2,
  target: { x: 0, y: 0, z: 0 },
};

export function Visualization3DCanvas({
  points,
  activePointId,
  onActivePointChange,
  colorMap,
  useJitter,
  resetToken,
}: Visualization3DCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const projectedRef = useRef<ProjectedPoint[]>([]);
  const dragStateRef = useRef<{
    mode: "rotate" | "pan";
    pointerX: number;
    pointerY: number;
    moved: boolean;
    yaw: number;
    pitch: number;
    distance: number;
    target: Vec3;
  } | null>(null);
  const [camera, setCamera] = useState<CameraState>(BASE_CAMERA);
  const [canvasSize, setCanvasSize] = useState({ width: 720, height: 420 });

  const worldPoints = useMemo(
    () => normalizeWorldPoints(points, useJitter),
    [points, useJitter],
  );
  const sceneBounds = useMemo(() => getSceneBounds(worldPoints), [worldPoints]);

  useEffect(() => {
    setCamera(getFittedCamera(sceneBounds));
  }, [resetToken, sceneBounds]);

  useEffect(() => {
    const wrapper = wrapperRef.current;
    if (!wrapper) {
      return;
    }

    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) {
        return;
      }

      setCanvasSize({
        width: Math.max(320, Math.round(entry.contentRect.width)),
        height: 420,
      });
    });
    observer.observe(wrapper);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }

    const context = canvas.getContext("2d");
    if (!context) {
      return;
    }

    const devicePixelRatio = window.devicePixelRatio || 1;
    canvas.width = Math.round(canvasSize.width * devicePixelRatio);
    canvas.height = Math.round(canvasSize.height * devicePixelRatio);
    canvas.style.width = `${canvasSize.width}px`;
    canvas.style.height = `${canvasSize.height}px`;
    context.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0);

    projectedRef.current = drawScene(
      context,
      canvasSize.width,
      canvasSize.height,
      worldPoints,
      sceneBounds,
      camera,
      activePointId,
      colorMap,
    );
  }, [activePointId, camera, canvasSize, colorMap, sceneBounds, worldPoints]);

  function handlePointerDown(event: React.PointerEvent<HTMLCanvasElement>) {
    dragStateRef.current = {
      mode: event.shiftKey ? "pan" : "rotate",
      pointerX: event.clientX,
      pointerY: event.clientY,
      moved: false,
      yaw: camera.yaw,
      pitch: camera.pitch,
      distance: camera.distance,
      target: camera.target,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function handlePointerMove(event: React.PointerEvent<HTMLCanvasElement>) {
    const dragState = dragStateRef.current;
    if (!dragState) {
      const hoveredPointId = findProjectedPointAt(
        projectedRef.current,
        getPointerPosition(event, canvasRef.current),
      );
      onActivePointChange(hoveredPointId);
      return;
    }

    const deltaX = event.clientX - dragState.pointerX;
    const deltaY = event.clientY - dragState.pointerY;
    if (Math.abs(deltaX) > 3 || Math.abs(deltaY) > 3) {
      dragState.moved = true;
    }

    if (dragState.mode === "pan") {
      const basis = getCameraBasis({
        ...camera,
        yaw: dragState.yaw,
        pitch: dragState.pitch,
        target: dragState.target,
      });
      const panScale = camera.distance * 0.0025;
      setCamera((current) => ({
        ...current,
        target: {
          x:
            dragState.target.x -
            basis.right.x * deltaX * panScale +
            basis.up.x * deltaY * panScale,
          y:
            dragState.target.y -
            basis.right.y * deltaX * panScale +
            basis.up.y * deltaY * panScale,
          z:
            dragState.target.z -
            basis.right.z * deltaX * panScale +
            basis.up.z * deltaY * panScale,
        },
      }));
      return;
    }

    setCamera((current) => ({
      ...current,
      yaw: dragState.yaw + deltaX * 0.01,
      pitch: clamp(dragState.pitch + deltaY * 0.01, -1.3, 1.3),
    }));
  }

  function handlePointerUp(event: React.PointerEvent<HTMLCanvasElement>) {
    const pointerPosition = getPointerPosition(event, canvasRef.current);
    if (!dragStateRef.current?.moved) {
      const clickedPointId = findProjectedPointAt(projectedRef.current, pointerPosition);
      if (clickedPointId) {
        onActivePointChange(clickedPointId);
      }
    }

    dragStateRef.current = null;
    event.currentTarget.releasePointerCapture(event.pointerId);
  }

  function handleWheel(event: React.WheelEvent<HTMLCanvasElement>) {
    event.preventDefault();
    const delta = event.deltaY > 0 ? 1.08 : 0.92;
    setCamera((current) => ({
      ...current,
      distance: clamp(
        current.distance * delta,
        Math.max(sceneBounds.radius * 1.4, 1.6),
        Math.max(sceneBounds.radius * 10, 9),
      ),
    }));
  }

  return (
    <div ref={wrapperRef} className="viz-canvas-wrap">
      <canvas
        ref={canvasRef}
        className="viz-canvas"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={() => {
          dragStateRef.current = null;
        }}
        onWheel={handleWheel}
      />
    </div>
  );
}

function drawScene(
  context: CanvasRenderingContext2D,
  width: number,
  height: number,
  points: VisualizationPoint[],
  sceneBounds: SceneBounds,
  camera: CameraState,
  activePointId: string | null,
  colorMap: Record<string, string>,
) {
  context.clearRect(0, 0, width, height);

  const projectedAxes = buildProjectedAxes(width, height, camera, sceneBounds);
  const projectedPoints = points
    .map((point) => {
      const projection = projectPoint(point, width, height, camera);
      if (!projection) {
        return null;
      }

      return {
        point,
        x: projection.x,
        y: projection.y,
        depth: projection.depth,
        scale: projection.scale,
        color: colorMap[point.document_id] ?? "#315efb",
      };
    })
    .filter((value): value is ProjectedPoint => Boolean(value))
    .sort((left, right) => left.depth - right.depth);

  drawBackground(context, width, height);
  drawGrid(context, width, height, camera, sceneBounds);
  drawAxes(context, projectedAxes);

  projectedPoints.forEach((projectedPoint) => {
    drawPoint(context, projectedPoint, projectedPoint.point.segment_id === activePointId);
  });

  const activePoint = projectedPoints.find(
    (projectedPoint) => projectedPoint.point.segment_id === activePointId,
  );
  if (activePoint) {
    drawPointLabel(context, activePoint);
  }

  return projectedPoints;
}

function drawBackground(
  context: CanvasRenderingContext2D,
  width: number,
  height: number,
) {
  const gradient = context.createLinearGradient(0, 0, 0, height);
  gradient.addColorStop(0, "rgba(255,255,255,0.98)");
  gradient.addColorStop(1, "rgba(242,246,252,0.96)");
  context.fillStyle = gradient;
  context.fillRect(0, 0, width, height);
}

function drawGrid(
  context: CanvasRenderingContext2D,
  width: number,
  height: number,
  camera: CameraState,
  sceneBounds: SceneBounds,
) {
  context.save();
  context.strokeStyle = "rgba(120, 136, 160, 0.18)";
  context.lineWidth = 1;

  const gridLines: Array<[Vec3, Vec3]> = [];
  const gridHalfSize = Math.max(sceneBounds.radius * 1.8, 1.6);
  const gridDivisions = 8;
  const gridStep = gridHalfSize / gridDivisions;
  const planeY = sceneBounds.center.y;

  for (let step = -gridDivisions; step <= gridDivisions; step += 1) {
    const position = sceneBounds.center.z + step * gridStep;
    gridLines.push([
      { x: sceneBounds.center.x - gridHalfSize, y: planeY, z: position },
      { x: sceneBounds.center.x + gridHalfSize, y: planeY, z: position },
    ]);
    const xPosition = sceneBounds.center.x + step * gridStep;
    gridLines.push([
      { x: xPosition, y: planeY, z: sceneBounds.center.z - gridHalfSize },
      { x: xPosition, y: planeY, z: sceneBounds.center.z + gridHalfSize },
    ]);
  }

  gridLines.forEach(([start, end]) => {
    const startProjection = projectWorldPoint(start, width, height, camera);
    const endProjection = projectWorldPoint(end, width, height, camera);
    if (!startProjection || !endProjection) {
      return;
    }

    context.beginPath();
    context.moveTo(startProjection.x, startProjection.y);
    context.lineTo(endProjection.x, endProjection.y);
    context.stroke();
  });

  context.restore();
}

function drawAxes(
  context: CanvasRenderingContext2D,
  axes: Array<{ label: string; color: string; start: Vec3; end: Vec3 }>,
) {
  context.save();
  context.lineWidth = 1.6;

  axes.forEach((axis) => {
    context.strokeStyle = axis.color;
    context.beginPath();
    context.moveTo(axis.start.x, axis.start.y);
    context.lineTo(axis.end.x, axis.end.y);
    context.stroke();
    context.fillStyle = axis.color;
    context.font = "12px SF Pro Text, Segoe UI, sans-serif";
    context.fillText(axis.label, axis.end.x + 6, axis.end.y - 4);
  });

  context.restore();
}

function drawPoint(
  context: CanvasRenderingContext2D,
  projectedPoint: ProjectedPoint,
  isActive: boolean,
) {
  const { point, x, y, scale, color } = projectedPoint;
  const radius = (point.role === "original" ? 5 : 6.3) * scale * (isActive ? 1.2 : 1);

  context.save();
  context.globalAlpha = 0.18;
  context.fillStyle = color;
  context.beginPath();
  context.arc(x, y, radius * 2.1, 0, Math.PI * 2);
  context.fill();

  context.globalAlpha = 0.95;
  context.fillStyle = color;
  context.strokeStyle = isActive ? "#0f1728" : "rgba(15, 23, 40, 0.28)";
  context.lineWidth = isActive ? 2 : 1;

  if (point.role === "original") {
    context.beginPath();
    context.arc(x, y, radius, 0, Math.PI * 2);
    context.fill();
    context.stroke();
  } else {
    context.beginPath();
    context.roundRect(x - radius, y - radius, radius * 2, radius * 2, 3);
    context.fill();
    context.stroke();
  }

  context.restore();
}

function drawPointLabel(
  context: CanvasRenderingContext2D,
  projectedPoint: ProjectedPoint,
) {
  context.save();
  context.fillStyle = "#0f1728";
  context.font = "11px SF Pro Text, Segoe UI, sans-serif";
  context.fillText(
    `#${projectedPoint.point.segment_index}`,
    projectedPoint.x + 8,
    projectedPoint.y - 8,
  );
  context.restore();
}

function buildProjectedAxes(
  width: number,
  height: number,
  camera: CameraState,
  sceneBounds: SceneBounds,
) {
  const axisLength = Math.max(sceneBounds.radius * 1.25, 1.2);
  const axes = [
    {
      label: "X",
      color: "#315efb",
      end: {
        x: sceneBounds.center.x + axisLength,
        y: sceneBounds.center.y,
        z: sceneBounds.center.z,
      },
    },
    {
      label: "Y",
      color: "#1f7a6b",
      end: {
        x: sceneBounds.center.x,
        y: sceneBounds.center.y + axisLength,
        z: sceneBounds.center.z,
      },
    },
    {
      label: "Z",
      color: "#b15d2f",
      end: {
        x: sceneBounds.center.x,
        y: sceneBounds.center.y,
        z: sceneBounds.center.z + axisLength,
      },
    },
  ];

  return axes
    .map((axis) => {
      const start = projectWorldPoint(sceneBounds.center, width, height, camera);
      const end = projectWorldPoint(axis.end, width, height, camera);
      if (!start || !end) {
        return null;
      }

      return {
        label: axis.label,
        color: axis.color,
        start,
        end,
      };
    })
    .filter(
      (
        axis,
      ): axis is { label: string; color: string; start: Vec3; end: Vec3 } =>
        Boolean(axis),
    );
}

function projectPoint(
  point: VisualizationPoint,
  width: number,
  height: number,
  camera: CameraState,
) {
  return projectWorldPoint(
    {
      x: point.x,
      y: point.y,
      z: point.z ?? 0,
    },
    width,
    height,
    camera,
  );
}

function projectWorldPoint(
  point: Vec3,
  width: number,
  height: number,
  camera: CameraState,
) {
  const basis = getCameraBasis(camera);
  const relative = subtract(point, basis.position);
  const cameraX = dot(relative, basis.right);
  const cameraY = dot(relative, basis.up);
  const cameraZ = dot(relative, basis.forward);

  if (cameraZ <= 0.05) {
    return null;
  }

  const focalLength = Math.min(width, height) * 0.68;
  const perspective = focalLength / cameraZ;

  return {
    x: width / 2 + cameraX * perspective,
    y: height / 2 - cameraY * perspective,
    z: cameraZ,
    depth: cameraZ,
    scale: clamp(perspective / 220, 0.35, 2.8),
  };
}

function getCameraBasis(camera: CameraState) {
  const position = {
    x:
      camera.target.x +
      camera.distance * Math.cos(camera.pitch) * Math.sin(camera.yaw),
    y: camera.target.y + camera.distance * Math.sin(camera.pitch),
    z:
      camera.target.z +
      camera.distance * Math.cos(camera.pitch) * Math.cos(camera.yaw),
  };

  const forward = normalize(subtract(camera.target, position));
  const provisionalUp = { x: 0, y: 1, z: 0 };
  const right = normalize(cross(forward, provisionalUp));
  const up = normalize(cross(right, forward));

  return {
    position,
    forward,
    right,
    up,
  };
}

function normalizeWorldPoints(points: VisualizationPoint[], useJitter: boolean) {
  if (points.length === 0) {
    return [];
  }

  const xs = points.map((point) => point.x);
  const ys = points.map((point) => point.y);
  const zs = points.map((point) => point.z ?? 0);

  const normalized = points.map((point) => ({
    ...point,
    x: normalizeAxis(point.x, xs),
    y: normalizeAxis(point.y, ys),
    z: normalizeAxis(point.z ?? 0, zs),
  }));

  if (!useJitter) {
    return normalized;
  }

  return normalized.map((point) => {
    const seed = stableSeed(point.segment_id);
    return {
      ...point,
      x: point.x + Math.cos(seed) * 0.01,
      y: point.y + Math.sin(seed) * 0.01,
      z: point.z + Math.cos(seed * 1.7) * 0.01,
    };
  });
}

function normalizeAxis(value: number, values: number[]) {
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  return ((value - min) / range) * 2.4 - 1.2;
}

function findProjectedPointAt(
  projectedPoints: ProjectedPoint[],
  pointer: { x: number; y: number } | null,
) {
  if (!pointer) {
    return null;
  }

  let bestMatch: { id: string; distance: number } | null = null;
  projectedPoints.forEach((projectedPoint) => {
    const dx = projectedPoint.x - pointer.x;
    const dy = projectedPoint.y - pointer.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    const threshold = Math.max(8, projectedPoint.scale * 10);

    if (distance > threshold) {
      return;
    }

    if (!bestMatch || distance < bestMatch.distance) {
      bestMatch = {
        id: projectedPoint.point.segment_id,
        distance,
      };
    }
  });

  return bestMatch?.id ?? null;
}

function getPointerPosition(
  event: React.PointerEvent<HTMLCanvasElement>,
  canvas: HTMLCanvasElement | null,
) {
  if (!canvas) {
    return null;
  }

  const rect = canvas.getBoundingClientRect();
  return {
    x: event.clientX - rect.left,
    y: event.clientY - rect.top,
  };
}

function subtract(left: Vec3, right: Vec3): Vec3 {
  return {
    x: left.x - right.x,
    y: left.y - right.y,
    z: left.z - right.z,
  };
}

function dot(left: Vec3, right: Vec3) {
  return left.x * right.x + left.y * right.y + left.z * right.z;
}

function cross(left: Vec3, right: Vec3): Vec3 {
  return {
    x: left.y * right.z - left.z * right.y,
    y: left.z * right.x - left.x * right.z,
    z: left.x * right.y - left.y * right.x,
  };
}

function normalize(vector: Vec3): Vec3 {
  const magnitude = Math.sqrt(dot(vector, vector)) || 1;
  return {
    x: vector.x / magnitude,
    y: vector.y / magnitude,
    z: vector.z / magnitude,
  };
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function stableSeed(value: string) {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) % 3600;
  }
  return (hash / 3600) * Math.PI * 2;
}

function getSceneBounds(points: VisualizationPoint[]): SceneBounds {
  if (points.length === 0) {
    return {
      center: { x: 0, y: 0, z: 0 },
      radius: 1.2,
      extentX: 1,
      extentY: 1,
      extentZ: 1,
    };
  }

  const xs = points.map((point) => point.x);
  const ys = points.map((point) => point.y);
  const zs = points.map((point) => point.z ?? 0);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  const minZ = Math.min(...zs);
  const maxZ = Math.max(...zs);
  const center = {
    x: (minX + maxX) / 2,
    y: (minY + maxY) / 2,
    z: (minZ + maxZ) / 2,
  };
  const extentX = maxX - minX || 1;
  const extentY = maxY - minY || 1;
  const extentZ = maxZ - minZ || 1;
  const radius =
    Math.max(extentX, extentY, extentZ, 1) * 0.9;

  return {
    center,
    radius,
    extentX,
    extentY,
    extentZ,
  };
}

function getFittedCamera(sceneBounds: SceneBounds): CameraState {
  return {
    ...BASE_CAMERA,
    target: sceneBounds.center,
    distance: Math.max(sceneBounds.radius * 3.4, 4.2),
  };
}
