import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('Seeding Datenbank...')

  await prisma.absenceRequest.deleteMany()
  await prisma.candidate.deleteMany()
  await prisma.jobPosting.deleteMany()
  await prisma.employee.deleteMany()
  await prisma.department.deleteMany()

  const engineering = await prisma.department.create({ data: { name: 'Engineering' } })
  const hr = await prisma.department.create({ data: { name: 'Human Resources' } })
  const sales = await prisma.department.create({ data: { name: 'Sales' } })
  const marketing = await prisma.department.create({ data: { name: 'Marketing' } })
  const finance = await prisma.department.create({ data: { name: 'Finance' } })

  const anna = await prisma.employee.create({
    data: {
      firstName: 'Anna', lastName: 'Müller', email: 'anna.mueller@example.com',
      phone: '+49 151 12345678', dateOfBirth: new Date('1990-04-15'),
      gender: 'FEMALE', street: 'Musterstraße 12', city: 'Berlin',
      postalCode: '10115', country: 'Deutschland',
      emergencyName: 'Klaus Müller', emergencyPhone: '+49 151 87654321',
      departmentId: engineering.id, position: 'Senior Software Engineer',
      startDate: new Date('2021-03-15'), status: 'ACTIVE',
      employmentType: 'FULL_TIME', weeklyHours: 40,
      salary: 72000, salaryGrade: 'E4',
      bio: 'Leidenschaftliche Softwareentwicklerin mit Fokus auf React und TypeScript.',
      skills: 'React,TypeScript,Node.js,PostgreSQL,Docker',
    },
  })

  const thomas = await prisma.employee.create({
    data: {
      firstName: 'Thomas', lastName: 'Schmidt', email: 'thomas.schmidt@example.com',
      phone: '+49 170 98765432', dateOfBirth: new Date('1985-09-22'),
      gender: 'MALE', street: 'Hauptstraße 5', city: 'Hamburg',
      postalCode: '20095', country: 'Deutschland',
      emergencyName: 'Maria Schmidt', emergencyPhone: '+49 170 11223344',
      departmentId: hr.id, position: 'HR Manager',
      startDate: new Date('2019-07-01'), status: 'ACTIVE',
      employmentType: 'FULL_TIME', weeklyHours: 40,
      salary: 65000, salaryGrade: 'M2',
      bio: 'Erfahrener HR-Manager mit 10+ Jahren im Personalwesen.',
      skills: 'Recruiting,Personalentwicklung,Arbeitsrecht,HRIS',
    },
  })

  const lisa = await prisma.employee.create({
    data: {
      firstName: 'Lisa', lastName: 'Weber', email: 'lisa.weber@example.com',
      phone: '+49 160 55544433', dateOfBirth: new Date('1993-12-08'),
      gender: 'FEMALE', street: 'Gartenweg 3', city: 'München',
      postalCode: '80331', country: 'Deutschland',
      emergencyName: 'Peter Weber', emergencyPhone: '+49 160 99988877',
      departmentId: sales.id, position: 'Account Executive',
      startDate: new Date('2022-01-10'), status: 'ACTIVE',
      employmentType: 'FULL_TIME', weeklyHours: 40,
      salary: 58000, salaryGrade: 'S3',
      bio: 'Vertriebsspezialistin mit Fokus auf Enterprise-Kunden im DACH-Raum.',
      skills: 'B2B Sales,CRM,Verhandlung,Präsentation',
    },
  })

  const markus = await prisma.employee.create({
    data: {
      firstName: 'Markus', lastName: 'Braun', email: 'markus.braun@example.com',
      phone: '+49 152 33445566', dateOfBirth: new Date('1988-06-30'),
      gender: 'MALE', street: 'Parkweg 18', city: 'Frankfurt',
      postalCode: '60311', country: 'Deutschland',
      emergencyName: 'Sabine Braun', emergencyPhone: '+49 152 66554433',
      departmentId: marketing.id, position: 'Marketing Manager',
      startDate: new Date('2020-05-01'), status: 'ACTIVE',
      employmentType: 'FULL_TIME', weeklyHours: 40,
      salary: 62000, salaryGrade: 'M3',
      bio: 'Digital-Marketing-Experte mit Schwerpunkt Content und SEO.',
      skills: 'SEO,Content Marketing,Google Ads,Analytics',
    },
  })

  const julia = await prisma.employee.create({
    data: {
      firstName: 'Julia', lastName: 'Hoffmann', email: 'julia.hoffmann@example.com',
      phone: '+49 176 22334455', dateOfBirth: new Date('1995-03-14'),
      gender: 'FEMALE', street: 'Lindenallee 7', city: 'Köln',
      postalCode: '50667', country: 'Deutschland',
      emergencyName: 'Werner Hoffmann', emergencyPhone: '+49 176 55443322',
      departmentId: finance.id, position: 'Financial Analyst',
      startDate: new Date('2023-02-01'), status: 'ACTIVE',
      employmentType: 'PART_TIME', weeklyHours: 30,
      salary: 48000, salaryGrade: 'F2',
      bio: 'Finanzanalystin mit Expertise in Controlling und Reporting.',
      skills: 'Excel,SAP,Controlling,Buchhaltung,Power BI',
    },
  })

  await prisma.department.update({ where: { id: engineering.id }, data: { managerId: anna.id } })
  await prisma.department.update({ where: { id: hr.id }, data: { managerId: thomas.id } })
  await prisma.department.update({ where: { id: sales.id }, data: { managerId: lisa.id } })

  const job1 = await prisma.jobPosting.create({
    data: {
      title: 'Sales Manager DACH', departmentId: sales.id, status: 'OPEN',
      description: 'Wir suchen einen erfahrenen Sales Manager für die DACH-Region. Du übernimmst Verantwortung für Enterprise-Accounts und baust unser Vertriebsteam aus.',
    },
  })
  const job2 = await prisma.jobPosting.create({
    data: {
      title: 'Frontend Developer (React)', departmentId: engineering.id, status: 'OPEN',
      description: 'Verstärke unser Engineering-Team als Frontend-Entwickler mit React & TypeScript. Wir bauen skalierbare SaaS-Produkte für den HR-Bereich.',
    },
  })
  await prisma.jobPosting.create({
    data: {
      title: 'HR Business Partner', departmentId: hr.id, status: 'OPEN',
      description: 'Als HR Business Partner bist du Ansprechpartner für unsere Führungskräfte und begleitest Change-Prozesse.',
    },
  })

  await prisma.candidate.createMany({
    data: [
      { firstName: 'Felix', lastName: 'Koch', email: 'felix.koch@mail.de', jobPostingId: job1.id, status: 'APPLIED', appliedAt: new Date('2024-11-10'), notes: 'Starkes Profil, 8 Jahre Sales-Erfahrung.' },
      { firstName: 'Sara', lastName: 'Hoffmann', email: 'sara.hoffmann@mail.de', jobPostingId: job2.id, status: 'SCREENING', appliedAt: new Date('2024-11-05') },
      { firstName: 'Max', lastName: 'Bauer', email: 'max.bauer@mail.de', jobPostingId: job2.id, status: 'INTERVIEW', appliedAt: new Date('2024-11-01'), notes: 'Sehr gutes technisches Interview.' },
      { firstName: 'Lena', lastName: 'Fischer', email: 'lena.fischer@mail.de', jobPostingId: job1.id, status: 'SCREENING', appliedAt: new Date('2024-11-12') },
      { firstName: 'David', lastName: 'Meyer', email: 'david.meyer@mail.de', jobPostingId: job2.id, status: 'OFFER', appliedAt: new Date('2024-10-20'), notes: 'Angebot verschickt, warte auf Rückmeldung.' },
    ],
  })

  await prisma.absenceRequest.createMany({
    data: [
      { employeeId: anna.id, type: 'VACATION', startDate: new Date('2025-08-01'), endDate: new Date('2025-08-15'), status: 'APPROVED', reason: 'Sommerurlaub' },
      { employeeId: thomas.id, type: 'SICK_LEAVE', startDate: new Date('2025-01-10'), endDate: new Date('2025-01-12'), status: 'APPROVED' },
      { employeeId: lisa.id, type: 'VACATION', startDate: new Date('2025-12-23'), endDate: new Date('2026-01-03'), status: 'PENDING', reason: 'Weihnachtsurlaub' },
      { employeeId: markus.id, type: 'VACATION', startDate: new Date('2025-06-01'), endDate: new Date('2025-06-07'), status: 'PENDING', reason: 'Kurzurlaub' },
      { employeeId: julia.id, type: 'SICK_LEAVE', startDate: new Date('2025-02-03'), endDate: new Date('2025-02-05'), status: 'APPROVED' },
    ],
  })

  console.log('Seeding abgeschlossen.')
  console.log(`  Abteilungen:     ${await prisma.department.count()}`)
  console.log(`  Mitarbeiter:     ${await prisma.employee.count()}`)
  console.log(`  Stellenangebote: ${await prisma.jobPosting.count()}`)
  console.log(`  Bewerber:        ${await prisma.candidate.count()}`)
  console.log(`  Abwesenheiten:   ${await prisma.absenceRequest.count()}`)
}

main()
  .catch(e => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())
