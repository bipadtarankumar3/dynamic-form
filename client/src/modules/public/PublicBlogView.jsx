import { Card, Image, Typography } from "antd";
import Paragraph from "antd/es/skeleton/Paragraph";
import moment from "moment";
import { useEffect, useState } from "react";
import { useParams } from "@/hooks/useNextRouter";
import { toast } from "react-toastify";
import { publicBlogDetails } from "@/services/public-service";
const { Title, Text } = Typography;
const PublicBlogView = () => {
  const { blg_id } = useParams();
  const [blogData, setBlogData] = useState({});


  const handleGetBlog = () => {
    if (blg_id) {
      publicBlogDetails({ blg_id: blg_id, })
        .then((data) => {
          setBlogData(data?.data?.data || []);
        })
        .catch((error) => {
          toast.error(
            error?.response?.data?.originalError ||
            error?.response?.data?.message
          );
        });
    }
  };

  useEffect(() => {
    const delayDebounce = setTimeout(() => {
      handleGetBlog();
    }, 500); // 500ms delay

    return () => clearTimeout(delayDebounce);
  }, [blg_id]);

  useEffect(() => {
    handleGetBlog();
  }, [blg_id]);

  return (
    <div className="home-content p-3">
      <div className="card pb-3">
        <div className="bg-gray-50 py-10 px-4">
          <div className="p-2">
            <Card className="p-6 rounded-xl shadow-md bg-white">
              {/* Title */}
              <div className="mb-6">
                <Title level={2} className="!mb-2 text-gray-800">
                  {blogData?.blg_title || ""}
                </Title>
                <Text type="secondary" className="text-sm">
                  {moment(blogData?.blg_created_at).format("MMMM D, YYYY")} &nbsp;&nbsp; | &nbsp;&nbsp; Author : {blogData?.doct_name}
                </Text>
              </div>

              {/* Image */}
              {blogData?.documents?.[0]?.file_path && (
                <div className="mb-6">
                  <Image
                    src={blogData?.documents?.[0]?.file_path}
                    alt="Blog"
                    className="w-full max-h-[500px] object-cover rounded-lg"
                    preview={false}
                  />
                </div>
              )}

              {/* Description */}
              {blogData?.blg_desc && (
                <Paragraph className="text-lg font-medium text-gray-700 mb-6 text-center">
                  {blogData?.blg_desc}
                </Paragraph>
              )}

              {/* Content */}
              {blogData?.blg_content && (
                <div
                  className="prose prose-lg max-w-none text-justify prose-img:rounded-md prose-headings:text-gray-800 prose-p:text-gray-700 mx-auto"
                  dangerouslySetInnerHTML={{ __html: blogData?.blg_content || "" }}
                />
              )}

              <div className="text-left font-medium text-sm mb-1 text-gray-500  line-clamp-3">
                Disclaimer :  The content shared through blogs, photos, and videos on PRANA is based on the professional expertise and knowledge of the respective doctors and therapists. PRANA does not verify, endorse, or assume responsibility for the accuracy, reliability, or applicability of the information provided.
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>

  );
};

export default PublicBlogView;
