import Image from "next/image";
import {ArrowUpRight} from "lucide-react";
import {school} from "@/lib/school";
import {PublicNav} from "@/components/public-nav";
export const metadata={title:"Trayectoria institucional"};
export default function Page(){return <><PublicNav/><main><h1 className="mx-auto max-w-7xl px-6 pt-16 text-4xl font-semibold">Trayectoria institucional</h1><section
            
            id="historia"
            className="mx-auto grid max-w-7xl scroll-mt-8 gap-10 px-6 py-16 sm:px-10 sm:py-24 lg:grid-cols-[.8fr_1.2fr]"
          >
            <div>
              <p className="text-xs font-semibold uppercase tracking-[.2em] text-[#586b80]">
                Nuestra historia
              </p>
              <h2 className="mt-5 text-4xl font-medium leading-tight tracking-[-.04em] sm:text-5xl">
                Una comunidad
                <br />
                que crece
                <br />
                <span className="text-[#2169a3]">con su escuela.</span>
              </h2>
            </div>
            <div>
              <div className="mb-7 flex items-center gap-5 rounded-2xl border border-blue-100 bg-white p-4">
                <Image
                  src="/colegio/edificio.jpg"
                  alt="Edificio de la unidad educativa con banderas"
                  width={400}
                  height={200}
                  className="w-1/2 rounded-lg object-contain"
                />
                <div>
                  <p className="text-xs uppercase tracking-widest text-blue-700">
                    Senkata · El Alto
                  </p>
                  <p className="mt-2 text-lg font-semibold">
                    Un lugar en nuestra historia.
                  </p>
                </div>
              </div>
              <p className="text-lg leading-8">
                Una reseña publicada en 2023 sitúa el origen de la Unidad
                Educativa Iberdrola en Senkata el 1 de marzo de 2002. Describe
                su crecimiento y la posterior organización en las secciones A y
                B.
              </p>
              <p className="mt-5 text-base leading-7 text-[#586b80]">
                La misma reseña recuerda la participación de su comunidad en
                actividades deportivas, musicales y artísticas.
              </p>
              <div className="mt-7 border-l-2 border-[#6b9ac9] pl-5">
                <p className="text-xs leading-6 text-[#586b80]">
                  Referencia histórica del blog sobre Iberdrola B, no una
                  certificación de la fecha de creación independiente de
                  Iberdrola A. Los logros específicos de la sección B no se
                  atribuyen aquí a la sección A.
                </p>
                <a
                  href={school.historyUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-3 inline-flex items-center gap-2 text-sm font-semibold underline underline-offset-4"
                >
                  Leer la reseña histórica{" "}
                  <ArrowUpRight size={16} aria-hidden="true" />
                </a>
              </div>
            </div>
          </section></main></>}