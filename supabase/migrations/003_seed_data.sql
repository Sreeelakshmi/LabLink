-- ============================================================
-- LabLink — Migration 003: Seed Data (Demo)
-- Run AFTER 001 and 002.
-- NOTE: Demo data only. No auth.users references.
-- ============================================================

-- ─────────────────────────────────────────────
-- DEPARTMENTS (4)
-- ─────────────────────────────────────────────
INSERT INTO public.departments (id, name, code, description) VALUES
  ('d1000000-0000-0000-0000-000000000001', 'Electronics & Communication', 'ece', 'Covers analog/digital electronics, embedded systems, and communication technology'),
  ('d1000000-0000-0000-0000-000000000002', 'Computer Science & Engineering', 'cs', 'Software systems, AI/ML research, networking and cybersecurity'),
  ('d1000000-0000-0000-0000-000000000003', 'Mechanical Engineering', 'me', 'Fabrication, thermodynamics, materials testing and CNC machining'),
  ('d1000000-0000-0000-0000-000000000004', 'Biotechnology', 'biotech', 'Genomics, cell culture, molecular diagnostics and biosafety labs')
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  code = EXCLUDED.code,
  description = EXCLUDED.description;

-- ─────────────────────────────────────────────
-- LABORATORIES (4 — one per department)
-- ─────────────────────────────────────────────
INSERT INTO public.laboratories (id, name, department_id, location, opening_hours, accessibility_information) VALUES
  ('b1000000-0000-0000-0000-000000000001',
   'ECE Advanced Lab',
   'd1000000-0000-0000-0000-000000000001',
   'Block A, Room 201',
   'Mon–Sat 08:00–20:00',
   'Wheelchair accessible. Hearing loop installed.'),
  ('b1000000-0000-0000-0000-000000000002',
   'CSE Research Lab',
   'd1000000-0000-0000-0000-000000000002',
   'Block B, Room 305',
   'Mon–Fri 09:00–21:00',
   'Ground floor, fully accessible.'),
  ('b1000000-0000-0000-0000-000000000003',
   'Mech Fabrication Lab',
   'd1000000-0000-0000-0000-000000000003',
   'Block C, Room 110',
   'Mon–Sat 08:00–18:00',
   'Large equipment — please inform lab staff of accessibility needs.'),
  ('b1000000-0000-0000-0000-000000000004',
   'BioTech Wet Lab',
   'd1000000-0000-0000-0000-000000000004',
   'Block D, Room 404',
   'Mon–Fri 09:00–17:00',
   'BSL-2 rated. Safety briefing required before first access.')
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  department_id = EXCLUDED.department_id,
  location = EXCLUDED.location,
  opening_hours = EXCLUDED.opening_hours,
  accessibility_information = EXCLUDED.accessibility_information;

-- ─────────────────────────────────────────────
-- RESOURCES (10)
-- ─────────────────────────────────────────────
INSERT INTO public.resources
  (id, laboratory_id, department_id, name, description, category, specifications, quantity_total, quantity_available, maintenance_status, prerequisites)
VALUES
  -- ECE Lab (3 resources)
  ('e1000000-0000-0000-0000-000000000001',
   'b1000000-0000-0000-0000-000000000001',
   'd1000000-0000-0000-0000-000000000001',
   'Oscilloscope DS1054Z',
   '4-channel digital storage oscilloscope for signal analysis',
   'Test Equipment',
   '{"bandwidth":"50MHz","channels":4,"sample_rate":"1GSa/s"}',
   4, 4, 'operational',
   'Completion of Basic Electronics Lab course'),

  ('e1000000-0000-0000-0000-000000000002',
   'b1000000-0000-0000-0000-000000000001',
   'd1000000-0000-0000-0000-000000000001',
   'Arduino Mega 2560 Kit',
   'Microcontroller development kit with sensor pack',
   'Development Kit',
   '{"microcontroller":"ATmega2560","flash":"256KB","analog_pins":16}',
   10, 10, 'operational',
   NULL),

  ('e1000000-0000-0000-0000-000000000003',
   'b1000000-0000-0000-0000-000000000001',
   'd1000000-0000-0000-0000-000000000001',
   'Function Generator FG-7002C',
   'Signal generator producing sine, square, triangle waveforms',
   'Test Equipment',
   '{"frequency_range":"0.1Hz–2MHz","output_impedance":"50Ω"}',
   3, 3, 'operational',
   'Completion of Basic Electronics Lab course'),

  -- CSE Lab (3 resources)
  ('e1000000-0000-0000-0000-000000000004',
   'b1000000-0000-0000-0000-000000000002',
   'd1000000-0000-0000-0000-000000000002',
   'NVIDIA Jetson Nano Dev Kit',
   'Edge AI development board for machine learning inference',
   'Development Kit',
   '{"gpu":"128-core Maxwell","cpu":"Quad-core A57","ram":"4GB LPDDR4"}',
   5, 5, 'operational',
   'Python programming proficiency'),

  ('e1000000-0000-0000-0000-000000000005',
   'b1000000-0000-0000-0000-000000000002',
   'd1000000-0000-0000-0000-000000000002',
   'Raspberry Pi 4 Cluster Node',
   '8-node cluster for distributed computing experiments',
   'Development Kit',
   '{"nodes":8,"ram_per_node":"8GB","storage":"32GB SD each"}',
   2, 2, 'operational',
   'Completion of Operating Systems course'),

  ('e1000000-0000-0000-0000-000000000006',
   'b1000000-0000-0000-0000-000000000002',
   'd1000000-0000-0000-0000-000000000002',
   'High-Performance Workstation',
   'GPU workstation for deep learning training (RTX 4090)',
   'Workstation',
   '{"gpu":"RTX 4090 24GB","cpu":"Intel i9-13900K","ram":"128GB DDR5"}',
   3, 3, 'operational',
   'Supervisor sign-off required'),

  -- Mech Lab (2 resources)
  ('e1000000-0000-0000-0000-000000000007',
   'b1000000-0000-0000-0000-000000000003',
   'd1000000-0000-0000-0000-000000000003',
   'CNC Milling Machine',
   '3-axis CNC mill for precision metal and plastic parts',
   'Fabrication',
   '{"axes":3,"spindle_speed":"10000 RPM","working_area":"500x400x200mm"}',
   2, 2, 'operational',
   'CNC Safety Certification required'),

  ('e1000000-0000-0000-0000-000000000008',
   'b1000000-0000-0000-0000-000000000003',
   'd1000000-0000-0000-0000-000000000003',
   'Universal Testing Machine',
   'Tensile, compression and bending tests up to 100kN',
   'Testing Equipment',
   '{"capacity":"100kN","crosshead_speed":"0.001–500mm/min"}',
   1, 0, 'maintenance',
   'Lab safety induction'),

  -- BioTech Lab (2 resources)
  ('e1000000-0000-0000-0000-000000000009',
   'b1000000-0000-0000-0000-000000000004',
   'd1000000-0000-0000-0000-000000000004',
   'PCR Thermal Cycler',
   'Standard PCR system for DNA amplification',
   'Analytical Instrument',
   '{"wells":96,"temperature_range":"4–99°C","ramp_rate":"3°C/s"}',
   3, 3, 'operational',
   'Biosafety Level 2 training'),

  ('e1000000-0000-0000-0000-000000000010',
   'b1000000-0000-0000-0000-000000000004',
   'd1000000-0000-0000-0000-000000000004',
   'Fluorescence Microscope',
   'Inverted fluorescence microscope for cell imaging',
   'Imaging',
   '{"magnification":"10x–100x","filters":"DAPI, FITC, TRITC","camera":"12MP CCD"}',
   2, 2, 'operational',
   'Microscopy safety training')
ON CONFLICT (id) DO UPDATE SET
  laboratory_id = EXCLUDED.laboratory_id,
  department_id = EXCLUDED.department_id,
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  category = EXCLUDED.category,
  specifications = EXCLUDED.specifications,
  quantity_total = EXCLUDED.quantity_total,
  quantity_available = EXCLUDED.quantity_available,
  maintenance_status = EXCLUDED.maintenance_status,
  prerequisites = EXCLUDED.prerequisites;
