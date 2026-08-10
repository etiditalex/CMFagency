"use client";

import { motion } from "framer-motion";
import Image from "next/image";

const SECTION_IMAGE =
  "https://res.cloudinary.com/dyfnobo9r/image/upload/v1786360469/careers_mtyoxg.jpg";

export default function CareerInCareerDevelopment() {
  return (
    <section
      className="careers-about w-full bg-primary-50 py-10 sm:py-14 md:py-16 lg:py-20"
      aria-labelledby="career-in-career-development"
    >
      <div className="w-full px-4 sm:px-6 lg:px-10 xl:px-14 2xl:px-16">
        <div className="grid w-full grid-cols-1 items-center gap-6 sm:gap-8 lg:grid-cols-12 lg:gap-12 xl:gap-16">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: "-40px" }}
            transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
            className="order-2 w-full lg:order-1 lg:col-span-7"
          >
            <h2
              id="career-in-career-development"
              className="!text-left font-montserrat text-xl font-bold tracking-tight text-gray-900 sm:text-3xl md:text-4xl"
            >
              A Career in Career Development
            </h2>

            <div className="mt-4 space-y-4 text-sm leading-relaxed text-gray-800 sm:mt-6 sm:text-base md:text-[1.05rem] md:leading-[1.7]">
              <p className="!text-left">
                There are many opportunities in career development, from working as careers support,
                a careers adviser or careers leader in schools, colleges and higher education, to
                working in careers providers or independently as a careers coach, consultant or
                counsellor. There are also opportunities to move into careers education and training,
                from freelance training and assessor roles to working as a lecturer, researcher or
                policy-maker.
              </p>
              <p className="!text-left">
                What unites everyone working in career development is their commitment to
                professional practice and desire to help young people and adults thrive in their
                careers. It is so much more than talking about jobs, it is helping individuals
                identify what they want from their future career, explore the pathways to achieve it
                and develop the career management skills that will support them throughout their
                lives.
              </p>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: "-40px" }}
            transition={{ duration: 0.55, delay: 0.08, ease: [0.22, 1, 0.36, 1] }}
            className="order-1 w-full lg:order-2 lg:col-span-5"
          >
            <div className="relative aspect-[16/11] w-full overflow-hidden rounded-xl bg-primary-100 sm:aspect-[4/3] sm:rounded-2xl lg:rounded-3xl">
              <Image
                src={SECTION_IMAGE}
                alt="Professionals collaborating on career development opportunities at Changer Fusions Kenya"
                fill
                className="object-cover object-center"
                sizes="(max-width: 640px) 100vw, (max-width: 1024px) 90vw, 42vw"
              />
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
