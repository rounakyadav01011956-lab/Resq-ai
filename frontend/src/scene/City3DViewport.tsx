import React, { useEffect, useRef, useState, useMemo } from 'react'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import type {
  CityModel,
  AgentState,
  HazardConfig,
  ExitConfig,
  AgentStatus
} from '../types/simulation'
import {
  Eye,
  Camera,
  Layers,
  Crosshair,
  User,
  Flame,
  CheckCircle2,
  Activity,
  ZoomIn
} from 'lucide-react'

interface City3DViewportProps {
  city: CityModel
  agents: AgentState[]
  hazards: HazardConfig[]
  exits: ExitConfig[]
  selectedAgentId: number | null
  onSelectAgent: (id: number | null) => void
  onMoveHazard?: (newX: number, newZ: number) => void
}

export const City3DViewport: React.FC<City3DViewportProps> = ({
  city,
  agents,
  hazards,
  exits,
  selectedAgentId,
  onSelectAgent,
  onMoveHazard
}) => {
  const containerRef = useRef<HTMLDivElement>(null)
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null)
  const sceneRef = useRef<THREE.Scene | null>(null)
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null)
  const controlsRef = useRef<OrbitControls | null>(null)
  const groundMeshRef = useRef<THREE.Mesh | null>(null)

  const [isPlacingHazard, setIsPlacingHazard] = useState(false)
  const isPlacingHazardRef = useRef(false)
  isPlacingHazardRef.current = isPlacingHazard

  // Groups for layer control
  const buildingsGroupRef = useRef<THREE.Group>(new THREE.Group())
  const roadsGroupRef = useRef<THREE.Group>(new THREE.Group())
  const hazardsGroupRef = useRef<THREE.Group>(new THREE.Group())
  const exitsGroupRef = useRef<THREE.Group>(new THREE.Group())
  const agentsGroupRef = useRef<THREE.Group>(new THREE.Group())
  const routesGroupRef = useRef<THREE.Group>(new THREE.Group())
  const labelsGroupRef = useRef<THREE.Group>(new THREE.Group())

  // Agent meshes map
  const agentMeshesRef = useRef<Map<number, {
    group: THREE.Group
    bodyMesh: THREE.Mesh
    leftLeg: THREE.Mesh
    rightLeg: THREE.Mesh
    leftArm: THREE.Mesh
    rightArm: THREE.Mesh
    beacon: THREE.Mesh
    ring: THREE.Mesh
  }>>(new Map())

  // Layer toggles
  const [showBuildings, setShowBuildings] = useState(true)
  const [showRoads, setShowRoads] = useState(true)
  const [showHazards, setShowHazards] = useState(true)
  const [showExits, setShowExits] = useState(true)
  const [showAgents, setShowAgents] = useState(true)
  const [showRoutes, setShowRoutes] = useState(true)
  const [showLabels, setShowLabels] = useState(true)
  const [cameraMode, setCameraMode] = useState<'iso' | 'top' | 'street' | 'follow'>('iso')

  // Live HUD events
  const [eventLogs, setEventLogs] = useState<string[]>([
    '⚡ ResQ AI 3D Simulation Engine Initialized',
    '🏢 3D Urban Digital Twin loaded with architectural buildings & roads',
    '🟢 Safe emergency assembly exits online and beaconing',
    '🏃 Occupants tracking active and pathfinding toward safety'
  ])

  // Selected agent data
  const selectedAgentData = useMemo(() => {
    if (selectedAgentId === null) return null
    return agents.find((a) => a.id === selectedAgentId) || null
  }, [agents, selectedAgentId])

  // Track simulation events for the live log
  useEffect(() => {
    const safeCount = agents.filter((a) => a.status === 'SAFE').length
    const queuedCount = agents.filter((a) => a.status === 'QUEUED').length
    const trappedCount = agents.filter((a) => a.status === 'TRAPPED').length

    if (safeCount > 0 && Math.random() < 0.25) {
      setEventLogs((prev) => [
        `✅ ${safeCount} evacuees have reached safety assembly zones`,
        ...prev.slice(0, 5)
      ])
    }
    if (queuedCount > 5 && Math.random() < 0.2) {
      setEventLogs((prev) => [
        `⚠️ Bottleneck congestion: ${queuedCount} occupants queued at doorway crossings`,
        ...prev.slice(0, 5)
      ])
    }
    if (trappedCount > 0 && Math.random() < 0.15) {
      setEventLogs((prev) => [
        `🚨 Critical threat: ${trappedCount} occupants cut off by active hazard boundary`,
        ...prev.slice(0, 5)
      ])
    }
  }, [agents])

  // 1. Initialize Scene, Camera, Lights, and Renderer
  useEffect(() => {
    if (!containerRef.current) return

    const container = containerRef.current
    const width = container.clientWidth || 900
    const height = container.clientHeight || 580

    const scene = new THREE.Scene()
    scene.background = new THREE.Color(0x0a1122) // High-contrast navy slate
    sceneRef.current = scene

    const camera = new THREE.PerspectiveCamera(45, width / height, 1, 2500)
    camera.position.set(0, 200, 240)
    cameraRef.current = camera

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: 'high-performance' })
    renderer.setSize(width, height)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.shadowMap.enabled = true
    renderer.shadowMap.type = THREE.PCFSoftShadowMap
    renderer.toneMapping = THREE.ACESFilmicToneMapping
    renderer.toneMappingExposure = 1.25

    container.appendChild(renderer.domElement)
    rendererRef.current = renderer

    const controls = new OrbitControls(camera, renderer.domElement)
    controls.enableDamping = true
    controls.dampingFactor = 0.08
    controls.maxPolarAngle = Math.PI / 2 - 0.02
    controls.minDistance = 15
    controls.maxDistance = 800
    controls.target.set(0, 0, 0)
    controlsRef.current = controls

    // Ambient & Directional Lighting
    const ambientLight = new THREE.AmbientLight(0x64748b, 1.8)
    scene.add(ambientLight)

    const mainSun = new THREE.DirectionalLight(0xffffff, 2.5)
    mainSun.position.set(120, 250, 150)
    mainSun.castShadow = true
    mainSun.shadow.mapSize.width = 2048
    mainSun.shadow.mapSize.height = 2048
    mainSun.shadow.camera.near = 10
    mainSun.shadow.camera.far = 700
    mainSun.shadow.camera.left = -220
    mainSun.shadow.camera.right = 220
    mainSun.shadow.camera.top = 220
    mainSun.shadow.camera.bottom = -220
    scene.add(mainSun)

    const skyFillLight = new THREE.HemisphereLight(0x38bdf8, 0x0f172a, 1.2)
    scene.add(skyFillLight)

    // Ground Plane
    const groundGeo = new THREE.PlaneGeometry(1000, 1000)
    const groundMat = new THREE.MeshStandardMaterial({
      color: 0x0d1527,
      roughness: 0.8,
      metalness: 0.2
    })
    const ground = new THREE.Mesh(groundGeo, groundMat)
    ground.rotation.x = -Math.PI / 2
    ground.position.y = -0.2
    ground.receiveShadow = true
    scene.add(ground)
    groundMeshRef.current = ground

    // High-visibility neon tactical grid
    const gridHelper = new THREE.GridHelper(500, 50, 0x0ea5e9, 0x1e293b)
    gridHelper.position.y = 0.02
    scene.add(gridHelper)

    // Add Layer Groups
    scene.add(buildingsGroupRef.current)
    scene.add(roadsGroupRef.current)
    scene.add(hazardsGroupRef.current)
    scene.add(exitsGroupRef.current)
    scene.add(agentsGroupRef.current)
    scene.add(routesGroupRef.current)
    scene.add(labelsGroupRef.current)

    // Raycasting for interactive click
    const raycaster = new THREE.Raycaster()
    const mouse = new THREE.Vector2()

    const onPointerDown = (event: MouseEvent) => {
      if (!containerRef.current || !cameraRef.current) return
      const rect = containerRef.current.getBoundingClientRect()
      mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1
      mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1

      raycaster.setFromCamera(mouse, cameraRef.current)

      // If in Click-to-Move Hazard mode, click ground to place hazard
      if (isPlacingHazardRef.current && groundMeshRef.current && onMoveHazard) {
        const groundIntersects = raycaster.intersectObject(groundMeshRef.current)
        if (groundIntersects.length > 0) {
          const pt = groundIntersects[0].point
          onMoveHazard(Math.round(pt.x), Math.round(pt.z))
          setIsPlacingHazard(false)
          return
        }
      }

      const intersects = raycaster.intersectObjects(agentsGroupRef.current.children, true)

      if (intersects.length > 0) {
        let obj: THREE.Object3D | null = intersects[0].object
        while (obj && obj.parent !== agentsGroupRef.current) {
          obj = obj.parent
        }
        if (obj && obj.userData && typeof obj.userData.agentId === 'number') {
          onSelectAgent(obj.userData.agentId)
        }
      }
    }

    renderer.domElement.addEventListener('pointerdown', onPointerDown)

    // ResizeObserver ensures canvas always fills the card exactly
    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const w = entry.contentRect.width
        const h = entry.contentRect.height
        if (w > 0 && h > 0 && rendererRef.current && cameraRef.current) {
          cameraRef.current.aspect = w / h
          cameraRef.current.updateProjectionMatrix()
          rendererRef.current.setSize(w, h)
        }
      }
    })
    resizeObserver.observe(container)

    // Animation Loop
    let animId: number
    const clock = new THREE.Clock()

    const animate = () => {
      animId = requestAnimationFrame(animate)
      const delta = clock.getDelta()
      const elapsed = clock.getElapsedTime()

      controls.update()

      // Follow selected agent if in follow camera mode
      if (cameraMode === 'follow' && selectedAgentData && controlsRef.current && cameraRef.current) {
        controlsRef.current.target.lerp(new THREE.Vector3(selectedAgentData.x, 3, selectedAgentData.z), 0.05)
      }

      // Animate Hazards (flickering flame cylinders & pulsing beacon flare)
      hazardsGroupRef.current.children.forEach((hGroup) => {
        hGroup.children.forEach((child) => {
          if (child.userData && child.userData.isFire) {
            const s = 1.0 + Math.sin(elapsed * 8 + child.id) * 0.1
            child.scale.set(s, 1.0 + Math.cos(elapsed * 7) * 0.15, s)
          } else if (child.userData && child.userData.isSmoke) {
            child.rotation.y += delta * 0.25
          } else if (child.userData && child.userData.isFlood) {
            child.position.y = 1.25 + Math.sin(elapsed * 3) * 0.2
          } else if (child.userData && child.userData.isBeacon) {
            const op = 0.45 + Math.sin(elapsed * 6 + child.id) * 0.2
            if ((child as any).material) {
              ;(child as any).material.opacity = op
            }
          }
        })
      })

      // Animate Exit Beacons (pulsing rings & spinning beacon tops)
      exitsGroupRef.current.children.forEach((exGroup) => {
        const ring = exGroup.userData.ring as THREE.Mesh
        if (ring) {
          ring.rotation.z += delta * 0.8
        }
      })

      // Animate Walking Humanoids
      agentMeshesRef.current.forEach((meshData) => {
        const { group, leftLeg, rightLeg, leftArm, rightArm, beacon } = meshData
        const isMoving = group.userData.status === 'MOVING'

        // Sinusoidal floating beacon marker over head
        beacon.position.y = 5.2 + Math.sin(elapsed * 4 + group.id) * 0.35

        if (isMoving) {
          const walkPhase = elapsed * 14 + group.id
          leftLeg.rotation.x = Math.sin(walkPhase) * 0.7
          rightLeg.rotation.x = -Math.sin(walkPhase) * 0.7
          leftArm.rotation.x = -Math.sin(walkPhase) * 0.6
          rightArm.rotation.x = Math.sin(walkPhase) * 0.6
        } else {
          leftLeg.rotation.x = 0
          rightLeg.rotation.x = 0
          leftArm.rotation.x = 0
          rightArm.rotation.x = 0
        }
      })

      renderer.render(scene, camera)
    }

    animate()

    return () => {
      cancelAnimationFrame(animId)
      resizeObserver.disconnect()
      renderer.domElement.removeEventListener('pointerdown', onPointerDown)
      renderer.dispose()
      if (containerRef.current) {
        containerRef.current.innerHTML = ''
      }
    }
  }, [])

  // 2. Build 3D Buildings & Roads with guaranteed upright geometry
  useEffect(() => {
    if (!sceneRef.current) return

    // Clear old city geometry
    while (buildingsGroupRef.current.children.length > 0) {
      buildingsGroupRef.current.remove(buildingsGroupRef.current.children[0])
    }
    while (roadsGroupRef.current.children.length > 0) {
      roadsGroupRef.current.remove(roadsGroupRef.current.children[0])
    }
    while (labelsGroupRef.current.children.length > 0) {
      labelsGroupRef.current.remove(labelsGroupRef.current.children[0])
    }

    // A. Build Upright 3D Architectural Buildings
    city.buildings.forEach((bldg) => {
      if (!bldg.footprint || bldg.footprint.length < 3) return

      let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity
      bldg.footprint.forEach((p) => {
        minX = Math.min(minX, p.x); maxX = Math.max(maxX, p.x)
        minZ = Math.min(minZ, p.z); maxZ = Math.max(maxZ, p.z)
      })

      const bw = Math.max(12, maxX - minX)
      const bd = Math.max(12, maxZ - minZ)
      const bh = Math.max(16, bldg.height)
      const cx = (minX + maxX) / 2
      const cz = (minZ + maxZ) / 2

      // Color scheme based on building type
      let bodyColor = 0x1e293b
      let edgeColor = 0x38bdf8
      let roofColor = 0x0f172a

      if (bldg.building_type === 'skyscraper') {
        bodyColor = 0x1e3a5f
        edgeColor = 0x38bdf8
        roofColor = 0x0284c7
      } else if (bldg.building_type === 'hospital') {
        bodyColor = 0x14532d
        edgeColor = 0x4ade80
        roofColor = 0x15803d
      } else if (bldg.building_type === 'residential') {
        bodyColor = 0x334155
        edgeColor = 0xf59e0b
        roofColor = 0x1e293b
      } else {
        bodyColor = 0x1e293b
        edgeColor = 0x06b6d4
        roofColor = 0x0f172a
      }

      const boxGeom = new THREE.BoxGeometry(bw, bh, bd)
      const bldgMat = new THREE.MeshStandardMaterial({
        color: bodyColor,
        roughness: 0.3,
        metalness: 0.6
      })

      const bldgMesh = new THREE.Mesh(boxGeom, bldgMat)
      // Upright position: stands on the ground at y=0, height reaches y=bh
      bldgMesh.position.set(cx, bh / 2, cz)
      bldgMesh.castShadow = true
      bldgMesh.receiveShadow = true
      bldgMesh.userData = { bldgId: bldg.id, name: bldg.name, height: bh, type: bldg.building_type }

      // Illuminated Window Edge Lines
      const wireframe = new THREE.LineSegments(
        new THREE.EdgesGeometry(boxGeom, 30),
        new THREE.LineBasicMaterial({ color: edgeColor, linewidth: 2 })
      )
      bldgMesh.add(wireframe)

      // Rooftop Helipad / Equipment Cap
      const roofCap = new THREE.Mesh(
        new THREE.BoxGeometry(bw * 0.7, 2, bd * 0.7),
        new THREE.MeshStandardMaterial({ color: roofColor, metalness: 0.8 })
      )
      roofCap.position.set(0, bh / 2 + 1, 0)
      bldgMesh.add(roofCap)

      buildingsGroupRef.current.add(bldgMesh)
    })

    // B. Build 3D Asphalt Roads & Lane Markings
    city.roads.forEach((road) => {
      if (!road.points || road.points.length < 2) return

      for (let i = 0; i < road.points.length - 1; i++) {
        const p1 = road.points[i]
        const p2 = road.points[i + 1]

        const dx = p2.x - p1.x
        const dz = p2.z - p1.z
        const len = Math.sqrt(dx * dx + dz * dz)
        const angle = Math.atan2(dx, dz)

        // Asphalt road surface
        const roadGeom = new THREE.PlaneGeometry(road.width, len)
        const roadMat = new THREE.MeshStandardMaterial({
          color: road.is_blocked ? 0x7f1d1d : 0x1e293b,
          roughness: 0.9,
          metalness: 0.1
        })
        const roadMesh = new THREE.Mesh(roadGeom, roadMat)
        roadMesh.rotation.x = -Math.PI / 2
        roadMesh.rotation.z = -angle
        roadMesh.position.set((p1.x + p2.x) / 2, 0.1, (p1.z + p2.z) / 2)
        roadMesh.receiveShadow = true
        roadsGroupRef.current.add(roadMesh)

        // Bright white/yellow dashed center divider line
        const lineGeom = new THREE.PlaneGeometry(0.5, len * 0.96)
        const lineMat = new THREE.MeshBasicMaterial({ color: 0xfacc15 }) // High-vis road yellow
        const centerLine = new THREE.Mesh(lineGeom, lineMat)
        centerLine.rotation.x = -Math.PI / 2
        centerLine.rotation.z = -angle
        centerLine.position.set((p1.x + p2.x) / 2, 0.18, (p1.z + p2.z) / 2)
        roadsGroupRef.current.add(centerLine)
      }
    })

    // Auto-frame camera to current city bounding box
    if (cameraRef.current && controlsRef.current && city.bounds) {
      const cx = (city.bounds.min_x + city.bounds.max_x) / 2
      const cz = (city.bounds.min_z + city.bounds.max_z) / 2
      const span = Math.max(city.bounds.max_x - city.bounds.min_x, city.bounds.max_z - city.bounds.min_z, 100)
      controlsRef.current.target.set(cx, 0, cz)
      cameraRef.current.position.set(cx, span * 0.9, cz + span * 1.05)
      controlsRef.current.update()
    }
  }, [city])

  // 3. Render 3D Hazards & Safe Exits with High-Visibility Glowing Beacons
  useEffect(() => {
    // Clear old hazards & exits
    while (hazardsGroupRef.current.children.length > 0) {
      hazardsGroupRef.current.remove(hazardsGroupRef.current.children[0])
    }
    while (exitsGroupRef.current.children.length > 0) {
      exitsGroupRef.current.remove(exitsGroupRef.current.children[0])
    }

    // Helper: Create text sprite label
    const makeTextSprite = (text: string, bgColor: string, textColor: string = '#ffffff'): THREE.Sprite => {
      const canvas = document.createElement('canvas')
      canvas.width = 320
      canvas.height = 76
      const ctx = canvas.getContext('2d')
      if (!ctx) return new THREE.Sprite()

      ctx.fillStyle = bgColor
      if (typeof (ctx as any).roundRect === 'function') {
        ;(ctx as any).roundRect(0, 0, 320, 76, 12)
        ctx.fill()
      } else {
        ctx.fillRect(0, 0, 320, 76)
      }

      ctx.strokeStyle = '#ffffff'
      ctx.lineWidth = 3
      ctx.strokeRect(2, 2, 316, 72)

      ctx.fillStyle = textColor
      ctx.font = 'bold 22px Arial, sans-serif'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText(text, 160, 38)

      const texture = new THREE.CanvasTexture(canvas)
      const spriteMat = new THREE.SpriteMaterial({ map: texture, depthTest: false })
      const sprite = new THREE.Sprite(spriteMat)
      sprite.scale.set(28, 6.8, 1)
      return sprite
    }

    // Render Hazards with High-Visibility Beacons & Ground Danger Footprints
    hazards.forEach((h) => {
      if (!h.is_active) return

      const hazardGroup = new THREE.Group()
      hazardGroup.position.set(h.x, 0, h.z)

      if (h.category === 'fire') {
        // A. Towering Sky-High Red Flare Beacon (90m tall, visible over all walls)
        const beamGeo = new THREE.CylinderGeometry(2.5, 4.0, 90, 16)
        const beamMat = new THREE.MeshBasicMaterial({
          color: 0xef4444,
          transparent: true,
          opacity: 0.55
        })
        const beam = new THREE.Mesh(beamGeo, beamMat)
        beam.position.y = 45
        beam.userData = { isBeacon: true }
        hazardGroup.add(beam)

        // B. Pulsing Ground Danger Zone Disc (shows exact hazard radius footprint)
        const ringGeo = new THREE.RingGeometry(0.5, h.radius, 32)
        const ringMat = new THREE.MeshBasicMaterial({
          color: 0xef4444,
          side: THREE.DoubleSide,
          transparent: true,
          opacity: 0.6
        })
        const ring = new THREE.Mesh(ringGeo, ringMat)
        ring.rotation.x = -Math.PI / 2
        ring.position.y = 0.28
        hazardGroup.add(ring)

        // Yellow warning border perimeter ring
        const borderGeo = new THREE.RingGeometry(h.radius * 0.95, h.radius, 32)
        const borderMat = new THREE.MeshBasicMaterial({
          color: 0xfacc15,
          side: THREE.DoubleSide
        })
        const border = new THREE.Mesh(borderGeo, borderMat)
        border.rotation.x = -Math.PI / 2
        border.position.y = 0.32
        hazardGroup.add(border)

        // C. Central Animated Roaring Flame Cylinder
        const fireCyl = new THREE.Mesh(
          new THREE.CylinderGeometry(h.radius * 0.45, h.radius * 0.85, 18, 24),
          new THREE.MeshBasicMaterial({ color: 0xff3b30, transparent: true, opacity: 0.85 })
        )
        fireCyl.position.y = 9
        fireCyl.userData = { isFire: true }
        hazardGroup.add(fireCyl)

        // Core flame point light
        const flameLight = new THREE.PointLight(0xff4500, 5, h.radius * 3.5)
        flameLight.position.y = 12
        hazardGroup.add(flameLight)

        // D. Floating 3D Waypoint Label Tag
        const label = makeTextSprite(`🔥 ACTIVE FIRE (${h.radius}m)`, 'rgba(220, 38, 38, 0.95)')
        label.position.set(0, 35, 0)
        hazardGroup.add(label)

      } else if (h.category === 'smoke') {
        // Toxic Smoke Sky Pillar
        const beamGeo = new THREE.CylinderGeometry(2.0, 3.5, 75, 16)
        const beamMat = new THREE.MeshBasicMaterial({
          color: 0x64748b,
          transparent: true,
          opacity: 0.4
        })
        const beam = new THREE.Mesh(beamGeo, beamMat)
        beam.position.y = 37.5
        hazardGroup.add(beam)

        // Ground smoke radius disc
        const ringGeo = new THREE.RingGeometry(0.5, h.radius, 32)
        const ringMat = new THREE.MeshBasicMaterial({
          color: 0x475569,
          side: THREE.DoubleSide,
          transparent: true,
          opacity: 0.55
        })
        const ring = new THREE.Mesh(ringGeo, ringMat)
        ring.rotation.x = -Math.PI / 2
        ring.position.y = 0.28
        hazardGroup.add(ring)

        const smokeMesh = new THREE.Mesh(
          new THREE.SphereGeometry(h.radius * 0.85, 16, 16),
          new THREE.MeshStandardMaterial({ color: 0x475569, transparent: true, opacity: 0.75 })
        )
        smokeMesh.position.y = 14
        smokeMesh.scale.set(1, 0.7, 1)
        smokeMesh.userData = { isSmoke: true }
        hazardGroup.add(smokeMesh)

        const label = makeTextSprite(`☁️ TOXIC SMOKE (${h.radius}m)`, 'rgba(71, 85, 105, 0.95)')
        label.position.set(0, 30, 0)
        hazardGroup.add(label)

      } else if (h.category === 'flood') {
        // Flood Sky Beam
        const beamGeo = new THREE.CylinderGeometry(2.0, 3.0, 60, 16)
        const beamMat = new THREE.MeshBasicMaterial({
          color: 0x0284c7,
          transparent: true,
          opacity: 0.4
        })
        const beam = new THREE.Mesh(beamGeo, beamMat)
        beam.position.y = 30
        hazardGroup.add(beam)

        // Flood Inundation Ground Ring
        const ringGeo = new THREE.RingGeometry(0.5, h.radius, 32)
        const ringMat = new THREE.MeshBasicMaterial({
          color: 0x0284c7,
          side: THREE.DoubleSide,
          transparent: true,
          opacity: 0.7
        })
        const ring = new THREE.Mesh(ringGeo, ringMat)
        ring.rotation.x = -Math.PI / 2
        ring.position.y = 0.3
        hazardGroup.add(ring)

        const waterMesh = new THREE.Mesh(
          new THREE.CylinderGeometry(h.radius, h.radius, 2.5, 32),
          new THREE.MeshStandardMaterial({ color: 0x0284c7, transparent: true, opacity: 0.85, metalness: 0.8 })
        )
        waterMesh.position.y = 1.25
        waterMesh.userData = { isFlood: true }
        hazardGroup.add(waterMesh)

        const label = makeTextSprite(`🌊 FLASH FLOOD (${h.radius}m)`, 'rgba(2, 132, 199, 0.95)')
        label.position.set(0, 24, 0)
        hazardGroup.add(label)

      } else {
        // Blocked Road Barricade
        const barMesh = new THREE.Mesh(
          new THREE.BoxGeometry(h.radius * 1.5, 4, 3),
          new THREE.MeshStandardMaterial({ color: 0xd97706, roughness: 0.5 })
        )
        barMesh.position.y = 2
        hazardGroup.add(barMesh)

        const label = makeTextSprite(`⛔ ROAD BLOCKED`, 'rgba(217, 119, 6, 0.95)')
        label.position.set(0, 15, 0)
        hazardGroup.add(label)
      }

      hazardsGroupRef.current.add(hazardGroup)
    })

    // Render Safe Exits
    exits.forEach((exit) => {
      const exitGroup = new THREE.Group()
      exitGroup.position.set(exit.x, 0, exit.z)

      // Laser Beacon Sky Pillar
      const beamGeo = new THREE.CylinderGeometry(2, 2, 80, 16)
      const beamMat = new THREE.MeshBasicMaterial({ color: 0x22c55e, transparent: true, opacity: 0.45 })
      const beam = new THREE.Mesh(beamGeo, beamMat)
      beam.position.y = 40
      exitGroup.add(beam)

      // Pulsing Green Ground Ring
      const ringGeo = new THREE.RingGeometry(8, 11, 32)
      const ringMat = new THREE.MeshBasicMaterial({ color: 0x22c55e, side: THREE.DoubleSide })
      const ring = new THREE.Mesh(ringGeo, ringMat)
      ring.rotation.x = -Math.PI / 2
      ring.position.y = 0.3
      exitGroup.add(ring)
      exitGroup.userData = { ring }

      // Portal Arch Gate
      const archMat = new THREE.MeshStandardMaterial({ color: 0x10b981, roughness: 0.3 })
      const p1 = new THREE.Mesh(new THREE.BoxGeometry(2, 12, 2), archMat)
      p1.position.set(-5, 6, 0)
      const p2 = new THREE.Mesh(new THREE.BoxGeometry(2, 12, 2), archMat)
      p2.position.set(5, 6, 0)
      const topBar = new THREE.Mesh(new THREE.BoxGeometry(12, 2, 2), archMat)
      topBar.position.set(0, 12, 0)
      exitGroup.add(p1, p2, topBar)

      // Floating 3D "EXIT" Billboard Tag
      const exitLabel = makeTextSprite(`🟢 SAFE EXIT`, 'rgba(16, 185, 129, 0.95)')
      exitLabel.position.set(0, 18, 0)
      exitGroup.add(exitLabel)

      exitsGroupRef.current.add(exitGroup)
    })
  }, [hazards, exits])

  // 4. Update 3D Human Agents & Trajectory Lines
  useEffect(() => {
    if (!sceneRef.current) return

    // Clean up agents that no longer exist
    const currentAgentIds = new Set(agents.map((a) => a.id))
    agentMeshesRef.current.forEach((val, id) => {
      if (!currentAgentIds.has(id)) {
        agentsGroupRef.current.remove(val.group)
        agentMeshesRef.current.delete(id)
      }
    })

    // Clear old route lines
    while (routesGroupRef.current.children.length > 0) {
      routesGroupRef.current.remove(routesGroupRef.current.children[0])
    }

    const statusColors: Record<AgentStatus, number> = {
      MOVING: 0x00f0ff, // Neon Cyan
      SAFE: 0x00ff66,   // Neon Green
      QUEUED: 0xffaa00, // Warning Amber
      TRAPPED: 0xff2244 // Critical Red
    }

    agents.forEach((agent) => {
      let agentEntry = agentMeshesRef.current.get(agent.id)

      if (!agentEntry) {
        // Construct Enlarged High-Visibility 3D Humanoid Model
        const group = new THREE.Group()
        group.userData = { agentId: agent.id, status: agent.status }

        const color = statusColors[agent.status]
        const bodyMat = new THREE.MeshStandardMaterial({
          color: color,
          roughness: 0.3,
          metalness: 0.3
        })

        // Torso (safety jacket)
        const torso = new THREE.Mesh(new THREE.BoxGeometry(1.6, 2.0, 0.9), bodyMat)
        torso.position.y = 2.4
        torso.castShadow = true

        // Head (helmet sphere)
        const head = new THREE.Mesh(
          new THREE.SphereGeometry(0.8, 16, 16),
          new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.2 })
        )
        head.position.y = 3.8
        head.castShadow = true

        // Legs
        const legGeom = new THREE.CylinderGeometry(0.32, 0.28, 1.8, 10)
        const leftLeg = new THREE.Mesh(legGeom, bodyMat)
        leftLeg.position.set(-0.45, 0.9, 0)
        leftLeg.castShadow = true

        const rightLeg = new THREE.Mesh(legGeom, bodyMat)
        rightLeg.position.set(0.45, 0.9, 0)
        rightLeg.castShadow = true

        // Arms
        const armGeom = new THREE.CylinderGeometry(0.24, 0.2, 1.6, 10)
        const leftArm = new THREE.Mesh(armGeom, bodyMat)
        leftArm.position.set(-1.05, 2.4, 0)

        const rightArm = new THREE.Mesh(armGeom, bodyMat)
        rightArm.position.set(1.05, 2.4, 0)

        // Floating Overhead Beacon Pin (Diamond Octahedron)
        const beaconGeom = new THREE.OctahedronGeometry(0.8, 0)
        const beaconMat = new THREE.MeshBasicMaterial({ color: color })
        const beacon = new THREE.Mesh(beaconGeom, beaconMat)
        beacon.position.y = 5.2

        // Ground Pulsing Ring
        const ringGeo = new THREE.RingGeometry(1.4, 1.9, 20)
        const ringMat = new THREE.MeshBasicMaterial({ color: color, side: THREE.DoubleSide })
        const ring = new THREE.Mesh(ringGeo, ringMat)
        ring.rotation.x = -Math.PI / 2
        ring.position.y = 0.15

        group.add(torso, head, leftLeg, rightLeg, leftArm, rightArm, beacon, ring)
        agentsGroupRef.current.add(group)

        agentEntry = {
          group,
          bodyMesh: torso,
          leftLeg,
          rightLeg,
          leftArm,
          rightArm,
          beacon,
          ring
        }
        agentMeshesRef.current.set(agent.id, agentEntry)
      }

      // Update position and heading
      const { group, bodyMesh, beacon, ring } = agentEntry
      group.position.set(agent.x, 0, agent.z)
      group.rotation.y = agent.heading
      group.userData.status = agent.status

      // Color based on status
      const targetColor = statusColors[agent.status]
      ;(bodyMesh.material as THREE.MeshStandardMaterial).color.setHex(targetColor)
      ;(beacon.material as THREE.MeshBasicMaterial).color.setHex(targetColor)
      ;(ring.material as THREE.MeshBasicMaterial).color.setHex(targetColor)

      // Highlight selected agent
      if (agent.id === selectedAgentId) {
        beacon.scale.set(1.8, 1.8, 1.8)
        ring.scale.set(2.0, 2.0, 2.0)
      } else {
        beacon.scale.set(1.0, 1.0, 1.0)
        ring.scale.set(1.0, 1.0, 1.0)
      }

      // Draw high-visibility route lines with cyan glow
      if (showRoutes && agent.status === 'MOVING' && agent.route && agent.route.length > 1) {
        const points: THREE.Vector3[] = [
          new THREE.Vector3(agent.x, 0.5, agent.z),
          ...agent.route.map((pt) => new THREE.Vector3(pt[0], 0.5, pt[1]))
        ]
        const curve = new THREE.CatmullRomCurve3(points)
        const tubeGeom = new THREE.TubeGeometry(curve, points.length * 2, 0.35, 6, false)
        const tubeMat = new THREE.MeshBasicMaterial({
          color: agent.id === selectedAgentId ? 0x38bdf8 : 0x06b6d4,
          transparent: true,
          opacity: agent.id === selectedAgentId ? 0.95 : 0.6
        })
        const routeTube = new THREE.Mesh(tubeGeom, tubeMat)
        routesGroupRef.current.add(routeTube)
      }
    })
  }, [agents, selectedAgentId, showRoutes])

  // 5. Visibility Controls
  useEffect(() => {
    buildingsGroupRef.current.visible = showBuildings
    roadsGroupRef.current.visible = showRoads
    hazardsGroupRef.current.visible = showHazards
    exitsGroupRef.current.visible = showExits
    agentsGroupRef.current.visible = showAgents
    routesGroupRef.current.visible = showRoutes
    labelsGroupRef.current.visible = showLabels
  }, [showBuildings, showRoads, showHazards, showExits, showAgents, showRoutes, showLabels])

  // Camera Presets
  const setCameraPreset = (preset: 'iso' | 'top' | 'street' | 'follow') => {
    if (!cameraRef.current || !controlsRef.current) return
    setCameraMode(preset)
    if (preset === 'iso') {
      cameraRef.current.position.set(0, 200, 240)
      controlsRef.current.target.set(0, 0, 0)
    } else if (preset === 'top') {
      cameraRef.current.position.set(0, 320, 0.1)
      controlsRef.current.target.set(0, 0, 0)
    } else if (preset === 'street') {
      cameraRef.current.position.set(0, 18, 70)
      controlsRef.current.target.set(0, 8, -20)
    } else if (preset === 'follow') {
      // Pick first moving agent if none selected
      if (!selectedAgentId && agents.length > 0) {
        const firstMoving = agents.find((a) => a.status === 'MOVING') || agents[0]
        onSelectAgent(firstMoving.id)
      }
    }
  }

  return (
    <div className="relative w-full h-[580px] bg-slate-950 rounded-2xl overflow-hidden border border-slate-800 shadow-2xl flex flex-col">
      {/* 3D WebGL Canvas Container */}
      <div
        ref={containerRef}
        style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }}
        className={isPlacingHazard ? 'cursor-crosshair' : 'cursor-grab active:cursor-grabbing'}
      />

      {/* Top Left: Camera Presets & Interactive Hazard Placement Bar */}
      <div className="absolute top-4 left-4 flex flex-wrap gap-2 z-10 bg-slate-900/90 backdrop-blur-md p-2 rounded-xl border border-slate-700/60 shadow-xl items-center">
        <button
          onClick={() => setCameraPreset('iso')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
            cameraMode === 'iso' ? 'bg-cyan-600 text-white shadow-md' : 'text-slate-300 hover:bg-slate-800'
          }`}
          title="Full 3D Isometric View"
        >
          <Camera className="w-3.5 h-3.5" />
          <span>🏢 3D City View</span>
        </button>
        <button
          onClick={() => setCameraPreset('top')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
            cameraMode === 'top' ? 'bg-cyan-600 text-white shadow-md' : 'text-slate-300 hover:bg-slate-800'
          }`}
          title="2D Tactical Radar Map"
        >
          <Eye className="w-3.5 h-3.5" />
          <span>🗺️ 2D Tactical Map</span>
        </button>
        <button
          onClick={() => setCameraPreset('street')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
            cameraMode === 'street' ? 'bg-cyan-600 text-white shadow-md' : 'text-slate-300 hover:bg-slate-800'
          }`}
          title="Street Level Action Cam"
        >
          <Crosshair className="w-3.5 h-3.5" />
          <span>🎥 Street Cam</span>
        </button>
        <button
          onClick={() => setCameraPreset('follow')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
            cameraMode === 'follow' ? 'bg-purple-600 text-white shadow-md' : 'text-slate-300 hover:bg-slate-800'
          }`}
          title="Follow Moving Crowd"
        >
          <ZoomIn className="w-3.5 h-3.5" />
          <span>🔍 Follow Crowd</span>
        </button>

        <div className="h-4 w-[1px] bg-slate-700 mx-1 hidden sm:block" />

        {/* Interactive Click-to-Move Hazard Button */}
        <button
          onClick={() => setIsPlacingHazard(!isPlacingHazard)}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer border ${
            isPlacingHazard
              ? 'bg-red-600 text-white border-red-400 animate-pulse shadow-lg shadow-red-950'
              : 'bg-red-950/80 text-red-300 border-red-800/80 hover:bg-red-900'
          }`}
          title="Click ground to reposition Fire Hazard"
        >
          <Flame className="w-3.5 h-3.5 text-red-400" />
          <span>{isPlacingHazard ? '🎯 Click Ground to Place Fire!' : '📍 Click-to-Move Hazard'}</span>
        </button>
      </div>

      {/* Interactive Relocation Helper Banner */}
      {isPlacingHazard && (
        <div className="absolute top-16 left-1/2 -translate-x-1/2 z-20 bg-red-950/95 border-2 border-red-500 text-white px-5 py-2.5 rounded-xl text-xs font-bold shadow-2xl flex items-center gap-3 animate-bounce">
          <Flame className="w-4 h-4 text-red-400 animate-pulse" />
          <span>3D Map me kisi bhi sadak ya ground par click karein — Fire Hazard wahi relocate ho jayega!</span>
          <button
            onClick={() => setIsPlacingHazard(false)}
            className="text-slate-300 hover:text-white px-2 py-0.5 rounded bg-red-900 border border-red-700 text-[10px] cursor-pointer"
          >
            Cancel
          </button>
        </div>
      )}

      {/* Top Right: Layer Visibility Controls */}
      <div className="absolute top-4 right-4 bg-slate-900/90 backdrop-blur-md p-2.5 rounded-xl border border-slate-700/60 shadow-xl z-10 flex items-center gap-3 text-xs text-slate-300">
        <div className="flex items-center gap-1 font-semibold text-cyan-400">
          <Layers className="w-3.5 h-3.5" />
          <span>Layers:</span>
        </div>
        <label className="flex items-center gap-1 cursor-pointer hover:text-white">
          <input
            type="checkbox"
            checked={showBuildings}
            onChange={(e) => setShowBuildings(e.target.checked)}
            className="rounded accent-cyan-500 cursor-pointer"
          />
          Buildings
        </label>
        <label className="flex items-center gap-1 cursor-pointer hover:text-white">
          <input
            type="checkbox"
            checked={showRoads}
            onChange={(e) => setShowRoads(e.target.checked)}
            className="rounded accent-cyan-500 cursor-pointer"
          />
          Roads
        </label>
        <label className="flex items-center gap-1 cursor-pointer hover:text-white">
          <input
            type="checkbox"
            checked={showHazards}
            onChange={(e) => setShowHazards(e.target.checked)}
            className="rounded accent-red-500 cursor-pointer"
          />
          Hazards
        </label>
        <label className="flex items-center gap-1 cursor-pointer hover:text-white">
          <input
            type="checkbox"
            checked={showExits}
            onChange={(e) => setShowExits(e.target.checked)}
            className="rounded accent-green-500 cursor-pointer"
          />
          Exits
        </label>
        <label className="flex items-center gap-1 cursor-pointer hover:text-white">
          <input
            type="checkbox"
            checked={showAgents}
            onChange={(e) => setShowAgents(e.target.checked)}
            className="rounded accent-cyan-500 cursor-pointer"
          />
          Agents
        </label>
        <label className="flex items-center gap-1 cursor-pointer hover:text-white">
          <input
            type="checkbox"
            checked={showRoutes}
            onChange={(e) => setShowRoutes(e.target.checked)}
            className="rounded accent-cyan-500 cursor-pointer"
          />
          Routes
        </label>
        <label className="flex items-center gap-1 cursor-pointer hover:text-white">
          <input
            type="checkbox"
            checked={showLabels}
            onChange={(e) => setShowLabels(e.target.checked)}
            className="rounded accent-purple-500 cursor-pointer"
          />
          Labels
        </label>
      </div>

      {/* Bottom Left: Live Emergency Situation Log */}
      <div className="absolute bottom-4 left-4 bg-slate-900/90 backdrop-blur-md p-3 rounded-xl border border-slate-800 text-xs text-slate-300 shadow-2xl max-w-sm z-10 pointer-events-none">
        <div className="flex items-center gap-2 pb-1.5 mb-1.5 border-b border-slate-800 font-bold text-cyan-400 text-[11px] uppercase tracking-wider">
          <Activity className="w-3.5 h-3.5 animate-pulse text-emerald-400" />
          <span>Live Tactical Telemetry Feed</span>
        </div>
        <div className="space-y-1 font-mono text-[11px]">
          {eventLogs.slice(0, 3).map((log, i) => (
            <div key={i} className="text-slate-300 truncate">
              {log}
            </div>
          ))}
        </div>
      </div>

      {/* Bottom Center: Map Legend */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-slate-900/90 backdrop-blur-md px-4 py-2 rounded-xl border border-slate-800 text-xs text-slate-300 shadow-xl flex items-center gap-4 z-10">
        <div className="flex items-center gap-1.5">
          <span className="w-3.5 h-3.5 rounded-full bg-cyan-400 inline-block shadow-sm shadow-cyan-400"></span>
          <span>Moving ({agents.filter((a) => a.status === 'MOVING').length})</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-3.5 h-3.5 rounded-full bg-green-400 inline-block shadow-sm shadow-green-400"></span>
          <span>Safe ({agents.filter((a) => a.status === 'SAFE').length})</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-3.5 h-3.5 rounded-full bg-amber-400 inline-block shadow-sm shadow-amber-400"></span>
          <span>Queued ({agents.filter((a) => a.status === 'QUEUED').length})</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-3.5 h-3.5 rounded-full bg-red-500 inline-block shadow-sm shadow-red-500 animate-pulse"></span>
          <span>Trapped ({agents.filter((a) => a.status === 'TRAPPED').length})</span>
        </div>
        <div className="flex items-center gap-1.5 border-l border-slate-700 pl-3">
          <Flame className="w-3.5 h-3.5 text-red-500" />
          <span>Active Hazard</span>
        </div>
        <div className="flex items-center gap-1.5">
          <CheckCircle2 className="w-3.5 h-3.5 text-green-400" />
          <span>Safe Exit</span>
        </div>
      </div>

      {/* Bottom Right: Selected Agent Inspector Drawer */}
      {selectedAgentData && (
        <div className="absolute bottom-4 right-4 bg-slate-900/95 backdrop-blur-lg p-4 rounded-xl border border-cyan-500/50 text-xs text-slate-200 shadow-2xl w-80 z-20">
          <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-800">
            <div className="flex items-center gap-2 font-bold text-cyan-400 text-sm">
              <User className="w-4 h-4" />
              <span>Inspector: Occupant #{selectedAgentData.id}</span>
            </div>
            <button
              onClick={() => onSelectAgent(null)}
              className="text-slate-400 hover:text-white px-1.5 py-0.5 rounded cursor-pointer"
            >
              ✕
            </button>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-slate-400">Status:</span>
              <span
                className={`font-semibold px-2.5 py-0.5 rounded-full text-[11px] ${
                  selectedAgentData.status === 'SAFE'
                    ? 'bg-green-950 text-green-400 border border-green-800'
                    : selectedAgentData.status === 'MOVING'
                    ? 'bg-cyan-950 text-cyan-400 border border-cyan-800'
                    : selectedAgentData.status === 'QUEUED'
                    ? 'bg-amber-950 text-amber-400 border border-amber-800'
                    : 'bg-red-950 text-red-400 border border-red-800'
                }`}
              >
                {selectedAgentData.status === 'SAFE' && '🟢 SAFE (EVACUATED)'}
                {selectedAgentData.status === 'MOVING' && '🔵 MOVING EN ROUTE'}
                {selectedAgentData.status === 'QUEUED' && '🟡 QUEUED AT BOTTLENECK'}
                {selectedAgentData.status === 'TRAPPED' && '🔴 TRAPPED (CUT OFF)'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Position in City:</span>
              <span className="font-mono text-slate-300">
                X: {selectedAgentData.x.toFixed(1)}m, Z: {selectedAgentData.z.toFixed(1)}m
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Target Assembly Gate:</span>
              <span className="text-emerald-400 font-bold">
                {selectedAgentData.target_exit_id || 'None (Route Cut Off)'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Distance Travelled:</span>
              <span className="font-mono">{selectedAgentData.distance_travelled.toFixed(1)} meters</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Doorway Queuing Delay:</span>
              <span className="font-mono text-amber-400">{selectedAgentData.waited_steps} wait cycles</span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
