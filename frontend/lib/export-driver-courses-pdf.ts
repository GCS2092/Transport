import type { Driver, Reservation } from '@/lib/api'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'

export async function exportDriverCoursesPdf(driver: Driver, rides: Reservation[], title = 'Mes courses') {
  const [{ default: jsPDF }, { default: autoTable }] = await Promise.all([
    import('jspdf'),
    import('jspdf-autotable'),
  ])

  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  const generated = format(new Date(), "dd/MM/yyyy HH:mm", { locale: fr })

  doc.setFontSize(16)
  doc.text("WEND'D Transport", 14, 16)
  doc.setFontSize(10)
  doc.setTextColor(80, 80, 80)
  doc.text(`Chauffeur : ${driver.firstName} ${driver.lastName}`, 14, 24)
  doc.text(`Téléphone : ${driver.phone} · Véhicule : ${driver.vehicleType} ${driver.vehiclePlate || ''}`, 14, 30)
  doc.text(`Export du ${generated} · ${rides.length} course(s)`, 14, 36)
  doc.setTextColor(0, 0, 0)

  const rows = rides.map(r => [
    r.code,
    r.status,
    r.paymentStatus,
    format(new Date(r.pickupDateTime), 'dd/MM/yy HH:mm', { locale: fr }),
    `${r.pickupZone?.name || '—'} → ${r.dropoffZone?.name || '—'}`,
    String(r.amount ?? ''),
  ])

  autoTable(doc, {
    startY: 42,
    head: [['Code', 'Statut', 'Paiement', 'Date prise en charge', 'Trajet', 'Montant']],
    body: rows,
    styles: { fontSize: 8 },
    headStyles: { fillColor: [13, 59, 46] },
    margin: { left: 14, right: 14 },
  })

  doc.save(`wendd-courses-${driver.lastName}-${format(new Date(), 'yyyy-MM-dd')}.pdf`)
}
