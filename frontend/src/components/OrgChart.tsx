import { useNavigate } from 'react-router-dom'

interface Emp {
  id: number
  firstName: string
  lastName: string
  position?: string
  status: string
  department?: { name: string }
  managerId?: number | null
}

interface Node { emp: Emp; children: Node[] }

const CARD_W = 176  // w-44 = 11rem
const GAP    = 32   // gap-8
const COL_W  = CARD_W + GAP

function buildTree(emps: Emp[]): Node[] {
  const idSet = new Set(emps.map(e => e.id))
  const roots = emps.filter(e => !e.managerId || !idSet.has(e.managerId))
  function kids(parentId: number): Node[] {
    return emps
      .filter(e => e.managerId === parentId)
      .map(e => ({ emp: e, children: kids(e.id) }))
  }
  return roots.map(e => ({ emp: e, children: kids(e.id) }))
}

const statusDot: Record<string, string> = {
  ACTIVE: '#FF6B00', INACTIVE: '#555', ON_LEAVE: '#F5C400', TERMINATED: '#ff6666',
}

function Card({ emp, onClick }: { emp: Emp; onClick: () => void }) {
  return (
    <div
      onClick={onClick}
      style={{ width: CARD_W }}
      className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl p-4 cursor-pointer hover:border-[#FF6B00] hover:shadow-[0_0_20px_#FF6B0020] transition-all group text-center shrink-0"
    >
      <div className="relative inline-block mb-2">
        <div className="w-12 h-12 rounded-full bg-[#FF6B0022] text-[#FF6B00] flex items-center justify-center text-lg font-bold group-hover:bg-[#FF6B00] group-hover:text-white transition-all mx-auto">
          {emp.firstName[0]}{emp.lastName[0]}
        </div>
        <div
          className="absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-[#111]"
          style={{ backgroundColor: statusDot[emp.status] ?? '#555' }}
        />
      </div>
      <p className="text-white text-sm font-semibold truncate">{emp.firstName} {emp.lastName}</p>
      <p className="text-[#666] text-xs truncate mt-0.5">{emp.position ?? '—'}</p>
      {emp.department && <p className="text-[#444] text-xs truncate">{emp.department.name}</p>}
    </div>
  )
}

function OrgNode({ node, navigate }: { node: Node; navigate: ReturnType<typeof useNavigate> }) {
  const n = node.children.length
  const barWidth = n > 1 ? (n - 1) * COL_W : 0

  return (
    <div className="flex flex-col items-center">
      <Card emp={node.emp} onClick={() => navigate(`/employees/${node.emp.id}`)} />

      {n > 0 && (
        <>
          {/* Vertical line: parent → horizontal bar */}
          <div className="w-px h-8 bg-[#2A2A2A]" />

          {/* Children row */}
          <div className="relative flex" style={{ gap: GAP }}>
            {/* Horizontal connector */}
            {n > 1 && (
              <div
                className="absolute top-0 left-1/2 -translate-x-1/2 h-px bg-[#2A2A2A]"
                style={{ width: barWidth }}
              />
            )}

            {node.children.map(child => (
              <div key={child.emp.id} className="flex flex-col items-center" style={{ width: CARD_W }}>
                {/* Vertical line: horizontal bar → child card */}
                <div className="w-px h-8 bg-[#2A2A2A]" />
                <OrgNode node={child} navigate={navigate} />
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

export default function OrgChart({ employees }: { employees: Emp[] }) {
  const navigate = useNavigate()
  const tree = buildTree(employees)

  if (employees.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-[#555] text-sm">
        Keine Mitarbeiter vorhanden.
      </div>
    )
  }

  if (tree.every(n => n.children.length === 0) && tree.length > 1) {
    return (
      <div className="text-center py-10">
        <p className="text-[#555] text-sm mb-2">Keine Vorgesetzten-Beziehungen hinterlegt.</p>
        <p className="text-[#444] text-xs">Weise in der Mitarbeiter-Detailansicht einen Vorgesetzten zu.</p>
        <div className="flex flex-wrap gap-4 justify-center mt-8">
          {tree.map(n => (
            <Card key={n.emp.id} emp={n.emp} onClick={() => navigate(`/employees/${n.emp.id}`)} />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="overflow-auto p-8 min-h-[400px]">
      <div className="flex gap-16 justify-center flex-wrap">
        {tree.map(root => (
          <OrgNode key={root.emp.id} node={root} navigate={navigate} />
        ))}
      </div>
    </div>
  )
}
