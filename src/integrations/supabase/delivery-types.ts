export type DeliveryArea = {
  created_at: string
  description: string | null
  id: string
  name: string
  owner_id: string
  updated_at: string
}

export type Driver = {
  access_code: string
  created_at: string
  id: string
  name: string
  owner_id: string
  phone: string
  status: string
  updated_at: string
}

export type DeliveryBatch = {
  area_id: string
  created_at: string
  date: string
  driver_id: string | null
  id: string
  owner_id: string
  status: string
  updated_at: string
}

export type BatchDelivery = {
  batch_id: string
  created_at: string
  delivery_time: string | null
  id: string
  member_id: string
  owner_id: string
  proof_url: string | null
  remarks: string | null
  status: string
  updated_at: string
}

export type DeliveryStatusLog = {
  batch_delivery_id: string
  created_at: string
  id: string
  notes: string | null
  owner_id: string
  status: string
}

export type InvoiceSetting = {
  company_address: string | null
  company_logo_url: string | null
  created_at: string
  id: string
  invoice_prefix: string
  next_invoice_number: number
  owner_id: string
  tax_name: string | null
  tax_rate: number | null
  updated_at: string
}