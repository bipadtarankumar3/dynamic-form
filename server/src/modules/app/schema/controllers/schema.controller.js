const {
  getFormWithSection,
  buildFormGroupData,
} = require("../../../../helper/getFormWithSection.helper");

const schemaController = {
  // list: async (req, res) => {
  //   // fetching gallerySchema
  //   const gallerySchema = await getFormWithSection({
  //     form_slug: "picture_gallery",
  //   });

  //   if (!gallerySchema) {
  //     return res.status(400).json({
  //       status: false,
  //       message: "Invalid form gallerySchema",
  //     });
  //   }

  //   const groupDetails = await getFormGroupDetails({
  //     form_group: "skill_development",
  //   });

  //   if (!groupDetails?.tfg_from_group_details?.length) {
  //     return res.status(400).json({
  //       status: false,
  //       message: "Invalid form group",
  //     });
  //   }

  //   /* 3️⃣ Fetch schemas */
  //   const skillDevFormSchemas = await Promise.all(
  //     groupDetails.tfg_from_group_details.map(async (group) => ({
  //       slug: group.slug,
  //       title: group.title,
  //       form_id: group.form_id,
  //       schema: await getFormWithSection({
  //         section_slug: group.slug,
  //       }),
  //     })),
  //   );

  //   /* 4️⃣ Build schema map */
  //   const schemaMap = skillDevFormSchemas.reduce((acc, item) => {
  //     acc[item.slug] = item;
  //     return acc;
  //   }, {});

  //   /* 5️⃣ Merge into group details */
  //   const skillDevelopment = {
  //     ...groupDetails,
  //     tfg_from_group_details: groupDetails.tfg_from_group_details.map(
  //       (group) => ({
  //         ...group,
  //         [group.slug]: schemaMap[group.slug] || null,
  //       }),
  //     ),
  //   };

  //   // return res.status(200).json({
  //   //   status: true,
  //   //   data: gallerySchema,
  //   // });
  //   /* 6️⃣ Final response */
  //   return res.status(200).json({
  //     status: true,
  //     data: {
  //       picture_gallery: gallerySchema,
  //       skill_development: skillDevelopment,
  //     },
  //   });
  // },
  list: async (req, res) => {
    // 1️⃣ Picture Gallery
    const gallerySchema = await getFormWithSection({
      form_slug: "picture_gallery",
    });

    if (!gallerySchema) {
      return res.status(400).json({
        status: false,
        message: "Invalid form gallerySchema",
      });
    }

    // 2️⃣ Fetch groups
    const skillDevelopment = await buildFormGroupData("skill_development");
    const sports = await buildFormGroupData("sports");
    const education = await buildFormGroupData("education");
    const shg = await buildFormGroupData("shg");
    const health = await buildFormGroupData("health");

    if (!skillDevelopment && !sports && !education && !shg && !health) {
      return res.status(400).json({
        status: false,
        message: "Invalid form group",
      });
    }

    // 3️⃣ Final response
    return res.status(200).json({
      status: true,
      data: {
        picture_gallery: gallerySchema,
        skill_development: skillDevelopment,
        sports: sports,
        education: education,
        shg: shg,
        health: health,
      },
    });
  },
};

module.exports = schemaController;
