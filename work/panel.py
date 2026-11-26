from pathlib import Path
import re,shutil
R=Path('apps/web/src');C=R/'components';A=R/'app'
# Remove a balanced object property without touching surrounding objects.
def prop(s,key):
 pattern=re.compile(r'^  '+key+r': |^    '+key+r': ',re.M);m=pattern.search(s)
 if not m:return s
 start=m.start();i=m.end();depth=0;quote=None;escape=False
 for j in range(i,len(s)):
  ch=s[j]
  if quote:
   if escape:escape=False
   elif ch=='\\':escape=True
   elif ch==quote:quote=None
   continue
  if ch in '\"\'`':quote=ch;continue
  if ch in '[{(':depth+=1
  elif ch in ']})':depth-=1
  if depth==0 and ch==',':return s[:start]+s[j+1:]
 return s
p=Path('packages/shared/src/index.ts');s=p.read_text().replace('  | "comunicados"','').replace('  "comunicados",','').replace('  comunicados: "Comunicados",','').replace('DIRECTOR: "Dirección"','DIRECTOR: "Administrador"').replace('SECRETARIA: "Secretaría"','SECRETARIA: "Personal administrativo"');p.write_text(s.replace('| "horarios"\n;','| "horarios";'))
p=R/'lib/data/model.ts';s=p.read_text();s=re.sub(r'  notices: \{.*?\}\[\];\n','',s,flags=re.S);s=prop(s,'comunicados');p.write_text(s)
p=R/'lib/data/demo.ts';s=p.read_text();s=prop(s,'comunicados');s=prop(s,'notices');p.write_text(s)
p=R/'lib/data/live.ts';s=p.read_text();s=re.sub(r'^    comunicados:.*\n','',s,flags=re.M);s=s.replace('      notices: [],\n','').replace('    notices,\n','');s=re.sub(r'    supabase\n      .from\("comunicados"\).*?\.limit\(100\),\n','',s,flags=re.S);s=prop(s,'comunicados');s=prop(s,'notices');p.write_text(s)
for f in ['app/panel/comunicados','components/notice-forms.tsx','lib/notices.ts']:
 p=R/f
 if p.is_dir():shutil.rmtree(p)
 elif p.exists():p.unlink()
# module page has only in-module actions; removed communications completely.
p=C/'module-page.tsx';s=p.read_text();s=s[:s.index('      <p className="mt-5')]+'''\n    </PanelShell>\n  );\n}\n''';# remove old cross-module management links, canonical sidebar routes handle them
start=s.index('      {!model.demo');s=s[:start]+'''    </PanelShell>\n  );\n}\n''';p.write_text(s)
# Sidebar uses destinations directly, keeping active selection during CRUD.
p=C/'panel-shell.tsx';s=p.read_text().replace('import { useRouter }','import { usePathname, useRouter }');s=s.replace('  const router = useRouter();','''  const router = useRouter();
  const pathname=usePathname();
  const admin=canManage(model.role);
  const record=admin||model.role==="DOCENTE";
  const links:[string,string,string][]=[
    ...(admin?[["Gestión de usuarios","Gestionar usuarios","/panel/usuarios"],["Gestión de usuarios","Registro de estudiante","/panel/gestion/estudiantes"],["Gestión de usuarios","Gestión de docente","/panel/gestion/docentes"],["Gestión de usuarios","Familias y vínculos","/panel/gestion/tutores"]] as [string,string,string][]:model.role==="DOCENTE"?[["Gestión de usuarios","Mis estudiantes",panelHref(model,"estudiantes")]] as [string,string,string][]:model.role==="PADRE"?[["Familia","Mis hijos",panelHref(model,"estudiantes")]] as [string,string,string][]:[]),
    ["Administración de asignaturas",admin?"Gestionar asignaturas":"Mis asignaturas","/panel/asignaturas"],
    ...(admin?[["Administración de asignaturas","Cursos","/panel/gestion/cursos"],["Administración de asignaturas","Matrículas","/panel/gestion/matriculas"],["Administración de asignaturas","Asignaciones docentes","/panel/gestion/asignaciones"]] as [string,string,string][]:[]),
    ["Administración de asignaturas","Control de horarios",model.demo?panelHref(model,"horarios"):"/panel/horarios/semana"],
    ["Seguimiento académico","Control de asistencia",!model.demo&&record?"/panel/asistencia/registro":panelHref(model,"asistencia")],
    ["Seguimiento académico","Gestión de calificaciones",!model.demo&&record?"/panel/calificaciones/registro":panelHref(model,"calificaciones")],
    ...(!model.demo?[["Resultados","Informes y reportes","/panel/informes"]] as [string,string,string][]:[])
  ];''')
a=s.index('          {modules.map');b=s.index('\n        </nav>',a)
s=s[:a]+'''          {links.map(([group,label,href],i)=><div key={href}>{(i===0||links[i-1][0]!==group)&&<p className="px-3 pt-5 pb-2 text-sm font-semibold text-slate-500">{group}</p>}<Link href={href} onClick={()=>setOpen(false)} aria-current={pathname===href?"page":undefined} className={cn("block rounded-lg px-3 py-3 text-sm",pathname===href?"bg-white font-semibold text-blue-800":"text-slate-700 hover:bg-white/70")}>{label}</Link></div>)}'''+s[b:]
a=s.index('            <Link\n              href={panelHref(model, "comunicados")}');b=s.index('            <div className="flex size-9',a);s=s[:a]+s[b:]
a=s.index('        <footer');b=s.index('        </footer>',a)+len('        </footer>');s=s[:a]+s[b:];p.write_text(s)
# Remove cross-module tabs; sidebar is the single source of navigation.
p=A/'panel/gestion/[seccion]/page.tsx';s=p.read_text();a=s.index('      <nav\n');b=s.index('      </nav>',a)+len('      </nav>');s=s[:a]+s[b:];p.write_text(s)
for name in ['attendance-validation.ts','grades-validation.ts']:
 p=R/'lib'/name;p.write_text(p.read_text().replace('role === "DIRECTOR" || role === "DOCENTE"','role === "DIRECTOR" || role === "SECRETARIA" || role === "DOCENTE"'))
(C/'dashboard.tsx').write_text('''import {PanelShell} from "./panel-shell";
import {RecordsTable} from "./records-table";
import {Card} from "./ui/card";
import type {PanelModel} from "@/lib/data/model";
const copy={DIRECTOR:["Visión institucional","Supervisa la gestión académica y administra las cuentas de la comunidad."],SECRETARIA:["Gestión del día","Organiza estudiantes, docentes, horarios y el seguimiento académico."],DOCENTE:["Tus aulas, al día","Revisa los resultados, la asistencia y el horario de tus cursos."],PADRE:["Acompaña cada paso","Consulta los resultados y la asistencia de tus hijos vinculados. Cada registro indica a qué estudiante pertenece."],ESTUDIANTE:["Tu avance académico","Revisa tus calificaciones, tu asistencia y las materias de tu horario."]};
export function Dashboard({model}:{model:PanelModel}){const [title,body]=copy[model.role];const family=model.role==="PADRE"||model.role==="ESTUDIANTE";const stats=[[model.role==="PADRE"?"Hijos vinculados":model.role==="ESTUDIANTE"?"Ficha personal":"Estudiantes visibles",model.studentCount],["Calificaciones publicadas",model.publishedGrades],["Registros de asistencia",model.attendanceCount],[family?"Cursos vinculados":"Cursos visibles",model.courseCount]];return <PanelShell model={model}><p className="text-sm text-slate-500">Gestión {model.year??"sin configurar"}</p><h1 className="mt-2 text-4xl font-semibold">{title}</h1><p className="my-5 text-lg text-slate-600">{body}</p><div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{stats.map(([label,value])=><Card key={String(label)} className="p-6"><p className="text-sm text-slate-500">{label}</p><p className="mt-4 text-4xl font-semibold">{value}</p></Card>)}</div><div className="mt-8 space-y-8">{(family?["calificaciones","asistencia","horarios"] as const:["asistencia","calificaciones","horarios"] as const).map(module=><section key={module}><h2 className="mb-3 text-xl font-semibold">{model.listings[module].title}</h2><Card className="overflow-hidden"><RecordsTable listing={model.listings[module]} compact/></Card></section>)}</div><p className="mt-5 text-sm text-slate-500">Las listas muestran los registros recientes autorizados para tu cuenta. Usa el menú para consultar el detalle de cada módulo.</p></PanelShell>}
''')
