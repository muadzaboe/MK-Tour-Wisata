'use client'
import { useEffect, useState, Suspense } from 'react'
import { useParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'

function PesanKursi() {
  const { tripId } = useParams()
  const [trip, setTrip] = useState(null)
  const [booked, setBooked] = useState({})
  const [nama, setNama] = useState('')
  const [hp, setHp] = useState('')
  const [pilih, setPilih] = useState(null)
  const [pesan, setPesan] = useState('')

  async function loadData() {
    const { data: t } = await supabase.from('trips').select('*').eq('id', tripId).single()
    setTrip(t)
    const { data: b } = await supabase.from('bookings')
      .select('id, nomor_kursi, nama_penumpang, no_hp').eq('trip_id', tripId)
    const map = {}
    ;(b || []).forEach(x => {
      map[x.nomor_kursi] = { nama: x.nama_penumpang, id: x.id, hp: x.no_hp }
    })
    setBooked(map)
  }

  useEffect(() => {
    if (!tripId) return
    loadData()
    const channel = supabase.channel('kursi-' + tripId)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'bookings', filter: `trip_id=eq.${tripId}` }, () => loadData())
      .subscribe()
    return () => supabase.removeChannel(channel)
  }, [tripId])

  function tampilPesan(msg) {
    setPesan(msg)
    setTimeout(() => setPesan(''), 3000)
  }

  async function pesanKursi() {
    if (!pilih) return tampilPesan('Pilih kursi dulu')
    if (!nama.trim()) return tampilPesan('Isi nama penumpang dulu')
    if (booked[pilih]) return tampilPesan('Kursi itu sudah terisi')

    const { error } = await supabase.from('bookings').insert({
      trip_id: tripId, nomor_kursi: pilih, nama_penumpang: nama.trim(), no_hp: hp.trim(),
    })
    if (error) {
      tampilPesan('Gagal: kursi mungkin baru saja dipesan orang lain')
      loadData()
      return
    }
    tampilPesan('Berhasil! Kursi ' + pilih + ' atas nama ' + nama.trim())
    setNama(''); setHp(''); setPilih(null)
    loadData()
  }

  async function hapusKursi(nomor, namaOrang) {
    if (!confirm(`Hapus kursi ${nomor} (${namaOrang})?`)) return
    const { error } = await supabase.from('bookings').delete().eq('trip_id', tripId).eq('nomor_kursi', nomor)
    if (error) return tampilPesan('Gagal hapus')
    tampilPesan('Kursi ' + nomor + ' dihapus')
    if (pilih === nomor) setPilih(null)
    loadData()
  }

  if (!trip) return <p className="p-6">Memuat...</p>

  const terisi = Object.keys(booked).length
  const kosong = trip.total_kursi - terisi

  return (
    <main className="max-w-md mx-auto p-4 pb-24">
      <h1 className="text-xl font-bold">{trip.nama}</h1>
      <p className="text-sm text-gray-600 mb-1">{trip.rute} · {trip.tanggal}</p>
      <p className="text-sm mb-3">Terisi: <b>{terisi}</b> / {trip.total_kursi} · Kosong: <b>{kosong}</b></p>

      {/* --- MULAI DENAH KURSI --- */}
      <div className="border-4 border-gray-400 rounded-[3rem] p-4 mb-6 relative bg-gray-50">
        
        {/* Bagian Depan */}
        <div className="grid grid-cols-6 gap-2 mb-8">
          <div className="col-span-1 flex items-center justify-center border-2 border-gray-400 rounded-lg p-1 text-[10px] font-bold text-gray-600 bg-white h-14">
            KENET
          </div>
          <div className="col-span-1 flex items-center justify-center border-2 border-gray-400 rounded-lg p-1 text-[10px] font-bold text-gray-600 bg-white h-14">
            PANITIA
          </div>
          <div className="col-span-2"></div> {/* Lorong lebar */}
          <div className="col-span-2 flex items-center justify-center border-2 border-gray-400 rounded-lg p-1 text-[10px] font-bold text-gray-600 bg-white h-14">
            DRIVER
          </div>
        </div>

        {/* Bagian Kursi Penumpang */}
        <div className="grid grid-cols-6 gap-2">
          {Array.from({ length: trip.total_kursi }, (_, i) => i + 1).map(n => {
            const isi = booked[n]
            const dipilih = pilih === n

            const modulo = n % 4
            let gridClass = ""
            
            if (n > 44) {
              gridClass = ""; // Kursi belakang bebas
            } else {
              if (modulo === 1) gridClass = "col-start-1" 
              else if (modulo === 2) gridClass = "col-start-2" 
              else if (modulo === 3) gridClass = "col-start-5" 
              else if (modulo === 0) gridClass = "col-start-6" 
            }

            return (
              <button key={n} type="button" onClick={() => isi ? hapusKursi(n, isi.nama) : setPilih(n)}
                className={`${gridClass} p-1 rounded-lg text-xs border-2 leading-tight h-14 flex flex-col items-center justify-center shadow-sm
                  ${isi ? 'bg-gray-300 text-gray-700 border-gray-400' 
                  : dipilih ? 'bg-blue-600 text-white border-blue-700' 
                  : 'bg-white hover:bg-blue-50 border-gray-300'}`}>
                <div className="font-bold text-sm">{n}</div>
                {isi && <div className="truncate w-full text-[9px] px-1">{isi.nama}</div>}
              </button>
            )
          })}
        </div>
      </div>
      {/* --- AKHIR DENAH KURSI --- */}

      {/* Form Input */}
      <div className="space-y-2 mt-4">
        <input className="border p-2 w-full rounded" placeholder="Nama penumpang" value={nama} onChange={e => setNama(e.target.value)} />
        <input className="border p-2 w-full rounded" placeholder="No HP (opsional)" value={hp} onChange={e => setHp(e.target.value)} />
        <button onClick={pesanKursi} className="bg-blue-600 text-white w-full p-2 rounded font-semibold">
          {pilih ? `Pesan Kursi No. ${pilih}` : 'Pilih kursi di atas'}
        </button>
        {pilih && <button onClick={() => setPilih(null)} className="text-sm text-gray-600 w-full underline">Batal pilih kursi {pilih}</button>}
        {pesan && <p className="text-sm text-center text-green-700">{pesan}</p>}
      </div>
    </main>
  )
}
export default function HalamanPesanKursi() {
  return (
    <Suspense fallback={<p className="p-6 text-center">Memuat denah kursi...</p>}>
      <PesanKursi />
    </Suspense>
  )
}