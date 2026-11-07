import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import { Member } from '../types';

export async function exportTreeToImage(elementId: string, filename = 'pohon-silsilah-keluarga.png'): Promise<void> {
  const element = document.getElementById(elementId);
  if (!element) {
    throw new Error('Elemen pohon tidak ditemukan');
  }

  // Preserve scroll width for full tree capture
  const canvas = await html2canvas(element, {
    scale: 2,
    useCORS: true,
    backgroundColor: '#ffffff',
    windowWidth: element.scrollWidth,
    windowHeight: element.scrollHeight,
  });

  const link = document.createElement('a');
  link.download = filename;
  link.href = canvas.toDataURL('image/png');
  link.click();
}

export async function exportTreeToPdf(elementId: string, filename = 'pohon-silsilah-keluarga.pdf'): Promise<void> {
  const element = document.getElementById(elementId);
  if (!element) {
    throw new Error('Elemen pohon tidak ditemukan');
  }

  const canvas = await html2canvas(element, {
    scale: 2,
    useCORS: true,
    backgroundColor: '#ffffff',
    windowWidth: element.scrollWidth,
    windowHeight: element.scrollHeight,
  });

  const imgData = canvas.toDataURL('image/png');
  const imgWidth = canvas.width;
  const imgHeight = canvas.height;

  // Landscape orientation if wide
  const isLandscape = imgWidth > imgHeight;
  const pdf = new jsPDF({
    orientation: isLandscape ? 'landscape' : 'portrait',
    unit: 'px',
    format: [imgWidth, imgHeight],
  });

  pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight);
  pdf.save(filename);
}

export function exportMembersToCSV(members: Member[], filename = 'data-anggota-silsilah.csv'): void {
  const memberMap = new Map<string, string>();
  members.forEach(m => memberMap.set(m.id, m.name));

  const headers = [
    'ID',
    'Nama Lengkap',
    'Jenis Kelamin',
    'Orang Tua',
    'Tempat Lahir',
    'Tanggal Lahir',
    'Status Meninggal',
    'Tanggal Wafat',
    'Pasangan',
    'Alamat',
    'Catatan',
  ];

  const rows = members.map(m => [
    `"${m.id}"`,
    `"${(m.name || '').replace(/"/g, '""')}"`,
    `"${m.gender === 'female' ? 'Perempuan' : m.gender === 'male' ? 'Laki-laki' : '-'}"`,
    `"${(m.parentId ? memberMap.get(m.parentId) || m.parentId : 'Leluhur Tertua').replace(/"/g, '""')}"`,
    `"${(m.birthPlace || '').replace(/"/g, '""')}"`,
    `"${m.birthDate || ''}"`,
    `"${m.isDeceased ? 'Ya' : 'Tidak'}"`,
    `"${m.deathDate || ''}"`,
    `"${(m.spouse || '').replace(/"/g, '""')}"`,
    `"${(m.address || '').replace(/"/g, '""')}"`,
    `"${(m.notes || '').replace(/"/g, '""')}"`,
  ]);

  const csvContent = '\uFEFF' + [headers.join(','), ...rows.map(r => r.join(','))].join('\r\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
