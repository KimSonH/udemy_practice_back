import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { Course } from './entities/courses.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { Like, Repository, DataSource, QueryRunner } from 'typeorm';
import { CreateCourseDto } from './dto/create-course.dto';
import { UpdateCourseDto } from './dto/update-course.dto';
import { UdemyQuestionBanksService } from 'src/udemyQuestionBanks/udemy-question-banks.service';
import { CourseSetsService } from 'src/course-sets/course-sets.service';
import { CourseSet } from 'src/course-sets/entities/course-set.entity';
import { PaginationParams } from 'src/common/pagination.type';
import { QuestionDistributionOptions } from './interface';
@Injectable()
export class CoursesService {
  private logger = new Logger(CoursesService.name);

  constructor(
    @InjectRepository(Course)
    private readonly coursesRepository: Repository<Course>,
    private readonly courseSetsService: CourseSetsService,
    private readonly udemyQuestionBanksService: UdemyQuestionBanksService,
    private readonly dataSource: DataSource,
  ) {}

  // Kiểm tra và điều chỉnh số lượng câu hỏi trong mỗi set
  // async adjustQuestionDistribution(
  //   courseSets: CourseSet[],
  //   questionsPerSet: number,
  // ) {
  //   // Duyệt qua từng set
  //   for (let i = 0; i < courseSets.length; i++) {
  //     try {
  //       // Lấy set hiện tại cùng với các câu hỏi
  //       const courseSet = await this.courseSetsService.findOne(
  //         courseSets[i].id,
  //       );

  //       if (!courseSet) {
  //         console.log(`Không tìm thấy set với id ${courseSets[i].id}`);
  //         continue;
  //       }

  //       // Số câu hỏi hiện có trong set
  //       const currentQuestionCount = courseSet.udemyQuestionBanks.length;

  //       // Nếu thiếu câu hỏi
  //       if (currentQuestionCount < questionsPerSet) {
  //         const shortage = questionsPerSet - currentQuestionCount;
  //         console.log(`Set ${i + 1} thiếu ${shortage} câu hỏi`);

  //         // Lấy câu hỏi từ các set trước để bù vào
  //         let borrowedQuestions = [];

  //         // Duyệt qua các set trước đó
  //         for (let j = 0; j < i && borrowedQuestions.length < shortage; j++) {
  //           // Lấy thông tin set nguồn
  //           const sourceSet = await this.courseSetsService.findOne(
  //             courseSets[j].id,
  //           );

  //           if (!sourceSet || !sourceSet.udemyQuestionBanks) {
  //             console.log(
  //               `Không tìm thấy set nguồn với id ${courseSets[j].id} hoặc không có câu hỏi`,
  //             );
  //             continue;
  //           }

  //           // Số câu hỏi có thể lấy từ set này (không lấy quá nhiều từ một set)
  //           const canBorrow = Math.min(
  //             Math.ceil(sourceSet.udemyQuestionBanks.length * 0.2), // Lấy tối đa 20% số câu hỏi từ mỗi set
  //             shortage - borrowedQuestions.length,
  //           );

  //           if (canBorrow <= 0) continue;

  //           // Lấy các câu hỏi từ set trước để mượn
  //           const questionsToBorrow = sourceSet.udemyQuestionBanks.slice(
  //             0,
  //             canBorrow,
  //           );

  //           // Thêm vào danh sách câu hỏi mượn
  //           borrowedQuestions = [...borrowedQuestions, ...questionsToBorrow];

  //           console.log(
  //             `Đã mượn ${questionsToBorrow.length} câu hỏi từ Set ${j + 1}`,
  //           );
  //         }

  //         // Thêm câu hỏi đã mượn vào set hiện tại
  //         if (borrowedQuestions.length > 0) {
  //           // Tránh trùng lặp câu hỏi bằng cách kiểm tra ID
  //           const existingQuestionIds = new Set(
  //             courseSet.udemyQuestionBanks.map((q) => q.id),
  //           );
  //           const uniqueBorrowedQuestions = borrowedQuestions.filter(
  //             (q) => !existingQuestionIds.has(q.id),
  //           );

  //           courseSet.udemyQuestionBanks = [
  //             ...courseSet.udemyQuestionBanks,
  //             ...uniqueBorrowedQuestions,
  //           ];
  //           await this.courseSetsService.create(courseSet);

  //           console.log(
  //             `Đã thêm ${uniqueBorrowedQuestions.length} câu hỏi vào Set ${i + 1}`,
  //           );
  //         }
  //       }
  //     } catch (error) {
  //       console.error(`Lỗi khi xử lý Set ${i + 1}:`, error);
  //     }
  //   }
  // }

  // Helper method để shuffle mảng (Fisher-Yates algorithm)
  private shuffleArray(array: any[]): void {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
  }

  async distributeQuestions(
    categoryName: string,
    totalSets: number,
    minQuestionsPerSet: number,
    courseSets: CourseSet[],
    queryRunner: QueryRunner,
    questionsPerSet: number,
    options: QuestionDistributionOptions = {},
  ) {
    // Sử dụng giá trị mặc định hoặc từ cấu hình nếu không được cung cấp
    totalSets = totalSets || 6;
    questionsPerSet = questionsPerSet || 120;

    this.logger.log(
      `Bắt đầu phân phối với: totalSets=${totalSets}, questionsPerSet=${questionsPerSet}`,
    );

    const { questions: allQuestions, total: totalQuestions } =
      await this.udemyQuestionBanksService.findAllByCategoryName(categoryName);

    this.logger.log(`Tổng số câu hỏi có sẵn: ${totalQuestions}`);

    const { allowAutoAdjust = false, maxQuestionPercentage = 0.8 } = options;

    const maxAllowedQuestions = Math.floor(
      totalQuestions * maxQuestionPercentage,
    );
    if (questionsPerSet > totalQuestions) {
      if (allowAutoAdjust) {
        const adjustedQuestionsPerSet = Math.min(
          maxAllowedQuestions,
          totalQuestions,
        );
        this.logger.log(
          `Điều chỉnh số câu hỏi mỗi set từ ${questionsPerSet} xuống ${adjustedQuestionsPerSet}`,
        );
        questionsPerSet = adjustedQuestionsPerSet;
      } else {
        throw new BadRequestException(
          `Required questions (${questionsPerSet}) exceeds available questions (${totalQuestions}). ` +
            `Maximum allowed questions is ${maxAllowedQuestions} (${maxQuestionPercentage * 100}% of total questions).`,
        );
      }
    }

    // Xóa toàn bộ câu hỏi hiện có trong các set
    for (const set of courseSets) {
      await queryRunner.manager.query(
        `DELETE FROM course_set_udemy_question_banks_udemy_question_bank WHERE "courseSetId" = $1`,
        [set.id],
      );
    }

    // Kiểm tra xem có đủ câu hỏi không
    const totalNeeded = totalSets * questionsPerSet;
    const isEnough = totalQuestions >= totalNeeded;

    console.log(isEnough);
    if (isEnough) {
      // Trường hợp đủ hoặc dư câu hỏi: phân phối đều
      this.logger.log(
        `Đủ câu hỏi (${totalQuestions}/${totalNeeded}). Phân phối đều mỗi set ${questionsPerSet} câu.`,
      );

      // Tạo mảng shuffle để phân phối ngẫu nhiên
      const shuffledQuestions = [...allQuestions];
      // Shuffle câu hỏi để phân phối ngẫu nhiên
      this.shuffleArray(shuffledQuestions);

      // Phân phối đều mỗi set có đúng questionsPerSet câu
      for (let i = 0; i < totalSets; i++) {
        const startIdx = i * questionsPerSet;
        const endIdx = startIdx + questionsPerSet;
        // Lấy chính xác questionsPerSet câu hỏi
        const setQuestions = shuffledQuestions.slice(startIdx, endIdx);

        // Tạo relations để insert
        const relations = setQuestions.map((question) => ({
          courseSetId: courseSets[i].id,
          udemyQuestionBankId: question.id,
        }));

        // Batch insert
        if (relations.length > 0) {
          await queryRunner.manager
            .createQueryBuilder()
            .insert()
            .into('course_set_udemy_question_banks_udemy_question_bank')
            .values(relations)
            .execute();

          this.logger.log(
            `Đã phân phối ${relations.length} câu hỏi vào Set ${i + 1}`,
          );
        }
      }
    } else {
      // Trường hợp thiếu câu hỏi: thực hiện chiến lược "mượn"
      this.logger.log(
        `Thiếu câu hỏi (${totalQuestions}/${totalNeeded}). Áp dụng chiến lược mượn.`,
      );

      // Tính toán phân phối ban đầu
      await this.adjustQuestionDistribution(
        categoryName,
        totalSets,
        minQuestionsPerSet,
        courseSets,
        queryRunner,
        questionsPerSet,
      );
    }
  }

  async adjustQuestionDistribution(
    categoryName: string,
    totalSets: number,
    minQuestionsPerSet: number,
    courseSets: CourseSet[],
    queryRunner: QueryRunner,
    questionsPerSet: number,
  ) {
    const { questions: allQuestions, total: totalQuestions } =
      await this.udemyQuestionBanksService.findAllByCategoryName(categoryName);
    // Check the number of available questions / Kiểm tra số lượng câu hỏi có sẵn
    if (totalQuestions < totalSets * minQuestionsPerSet) {
      throw new BadRequestException(
        `Không đủ câu hỏi! Cần ít nhất ${totalSets * minQuestionsPerSet} câu hỏi để phân phối hợp lý.`,
      );
    }

    // Delete all questions currently in the sets (if any) / Xóa toàn bộ câu hỏi hiện có trong các set (nếu có)
    // for (const set of courseSets) {
    //   // Use direct query for better efficiency / Sử dụng query trực tiếp để hiệu quả hơn
    //   await queryRunner.manager.query(
    //     `DELETE FROM course_set_udemy_question_banks_udemy_question_bank WHERE "courseSetId" = $1`,
    //     [set.id],
    //   );
    // }

    // Calculate the initial distribution / Tính toán phân phối ban đầu
    const baseQuestionsPerSet = Math.floor(totalQuestions / totalSets);
    const remainder = totalQuestions % totalSets;

    this.logger.log(
      `Phân phối ban đầu: ${baseQuestionsPerSet} câu hỏi/set, với ${remainder} câu dư`,
    );

    let questionIndex = 0;
    for (let i = 0; i < totalSets; i++) {
      const setQuestionCount = baseQuestionsPerSet + (i < remainder ? 1 : 0);
      const setQuestions = allQuestions.slice(
        questionIndex,
        questionIndex + setQuestionCount,
      );
      questionIndex += setQuestionCount;

      if (setQuestions.length === 0) {
        this.logger.warn(`Không có câu hỏi để phân phối cho Set ${i + 1}`);
        continue;
      }

      // Create an array of records to insert in bulk / Tạo mảng các bản ghi liên kết để thêm hàng loạt
      const relations = setQuestions.map((question) => ({
        courseSetId: courseSets[i].id,
        udemyQuestionBankId: question.id,
      }));

      // Batch insert to improve efficiency / Batch insert để cải thiện hiệu suất
      if (relations.length > 0) {
        await queryRunner.manager
          .createQueryBuilder()
          .insert()
          .into('course_set_udemy_question_banks_udemy_question_bank')
          .values(relations)
          .execute();

        this.logger.log(
          `Đã phân phối ${setQuestions.length} câu hỏi vào Set ${i + 1}`,
        );
      }
    }

    // Borrow questions to ensure each set has enough questions / Mượn câu hỏi để đảm bảo mỗi set có đủ câu hỏi
    for (let i = 0; i < totalSets; i++) {
      // Count the number of questions currently in the set / Đếm số câu hỏi hiện có trong set
      const currentCount = await queryRunner.manager.query(
        `SELECT COUNT(*) FROM course_set_udemy_question_banks_udemy_question_bank WHERE "courseSetId" = $1`,
        [courseSets[i].id],
      );

      const shortage = questionsPerSet - parseInt(currentCount[0].count);

      if (shortage <= 0) continue;

      this.logger.log(`Set ${i + 1} cần thêm ${shortage} câu hỏi`);

      // Get the IDs of the questions currently in the set / Lấy ID của các câu hỏi hiện có trong set
      const existingQuestionResult = await queryRunner.manager.query(
        `SELECT "udemyQuestionBankId" FROM course_set_udemy_question_banks_udemy_question_bank WHERE "courseSetId" = $1`,
        [courseSets[i].id],
      );

      const existingQuestionIds = new Set(
        existingQuestionResult.map((item) => item.udemyQuestionBankId),
      );
      const borrowedRelations = [];

      // Calculate the number of questions to borrow from each set / Tính toán số câu hỏi cần mượn từ mỗi set
      const otherSets = totalSets - 1;
      const borrowPerSetBase = Math.floor(shortage / otherSets);
      const borrowRemainder = shortage % otherSets;

      let totalBorrowed = 0;
      let borrowCounter = 0;

      // Borrow questions from other sets / Mượn câu hỏi từ các set khác
      for (let j = 0; j < totalSets && totalBorrowed < shortage; j++) {
        if (j === i) continue;

        const toBorrow =
          borrowPerSetBase + (borrowCounter < borrowRemainder ? 1 : 0);
        borrowCounter++;

        if (toBorrow <= 0) continue;

        // Get questions from the source set that are not currently in the current set / Lấy câu hỏi từ set nguồn mà chưa có trong set hiện tại
        const availableQuestionsResult = await queryRunner.manager.query(
          `SELECT q.id FROM udemy_question_bank q 
       JOIN course_set_udemy_question_banks_udemy_question_bank csq ON q.id = csq."udemyQuestionBankId" 
       WHERE csq."courseSetId" = $1 AND q.id NOT IN (
         SELECT "udemyQuestionBankId" FROM course_set_udemy_question_banks_udemy_question_bank WHERE "courseSetId" = $2
       )
       LIMIT $3`,
          [courseSets[j].id, courseSets[i].id, toBorrow],
        );

        if (availableQuestionsResult.length > 0) {
          const questionsToAdd = availableQuestionsResult.map((item) => ({
            courseSetId: courseSets[i].id,
            udemyQuestionBankId: item.id,
          }));

          borrowedRelations.push(...questionsToAdd);
          totalBorrowed += questionsToAdd.length;

          this.logger.log(
            `Mượn ${questionsToAdd.length} câu hỏi từ Set ${j + 1}`,
          );
        }
      }

      // Add the borrowed questions to the set / Thêm các câu hỏi đã mượn vào set
      if (borrowedRelations.length > 0) {
        await queryRunner.manager
          .createQueryBuilder()
          .insert()
          .into('course_set_udemy_question_banks_udemy_question_bank')
          .values(borrowedRelations)
          .execute();

        this.logger.log(
          `Đã mượn tổng cộng ${borrowedRelations.length} câu hỏi vào Set ${i + 1}`,
        );
      }

      // Check again after borrowing / Kiểm tra lại sau khi mượn
      const finalCount = await queryRunner.manager.query(
        `SELECT COUNT(*) FROM course_set_udemy_question_banks_udemy_question_bank WHERE "courseSetId" = $1`,
        [courseSets[i].id],
      );

      if (parseInt(finalCount[0].count) < questionsPerSet) {
        this.logger.warn(
          `Set ${i + 1} vẫn thiếu câu hỏi. Hiện có: ${finalCount[0].count}/${questionsPerSet}`,
        );
      }
    }
  }

  async createCourse(createCourse: CreateCourseDto) {
    const {
      categoryName,
      content,
      courseSets: totalSets,
      description,
      name,
      organizationName,
      price,
      status,
      type,
      udemyQuestionBanks: questionsPerSet,
    } = createCourse;
    const course = new Course();
    course.name = name;
    course.description = description;
    course.price = price;
    course.status = status;
    course.type = type;
    course.categoryName = categoryName;
    course.organizationName = organizationName;
    course.content = content;
    // Minimum reasonable threshold when there are not enough questions / Ngưỡng tối thiểu hợp lý khi không đủ câu hỏi
    const minQuestionsPerSet = 100;

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();
    try {
      const courseSets: CourseSet[] = [];
      for (let i = 0; i < totalSets; i++) {
        const courseSet = new CourseSet();
        courseSet.name = `Course Set ${i + 1}`;
        const courseSetSaved = await this.courseSetsService.create(courseSet);
        // const courseSetSaved = await queryRunner.manager
        //   .createQueryBuilder()
        //   .insert()
        //   .into(CourseSet)
        //   .values(courseSet)
        //   .execute();
        courseSets.push(courseSetSaved);
      }

      course.courseSets = courseSets;

      await this.distributeQuestions(
        categoryName,
        totalSets,
        minQuestionsPerSet,
        courseSets,
        queryRunner,
        questionsPerSet,
      );

      // Commit transaction if everything is successful / Commit transaction nếu mọi thứ thành công
      await this.coursesRepository.save(course);
      await queryRunner.commitTransaction();

      // Check the final result / Kiểm tra kết quả cuối cùng
      this.logger.log('Phân phối câu hỏi hoàn tất');
      return course;
    } catch (error) {
      // Rollback if there is an error / Rollback nếu có lỗi
      await queryRunner.rollbackTransaction();
      this.logger.error(`Failed to distribute questions: ${error.message}`);
      throw error;
    } finally {
      // Release queryRunner / Giải phóng queryRunner
      await queryRunner.release();
    }
  }

  async findAllByCategoryName(query: PaginationParams) {
    const { page, limit } = query;
    const offset = (page - 1) * limit;
    const groupCategoryName: { categoryName: string; count: number }[] =
      await this.getGroupCategoryName();
    let total = 0;
    let items: Course[] = [];
    for (const course of groupCategoryName) {
      const [courses, totalCourse] = await this.coursesRepository.findAndCount({
        where: { categoryName: course.categoryName, status: 'active' },
        order: {
          createdAt: 'DESC',
        },
        take: limit,
        skip: offset,
      });
      items = [...items, ...courses];
      total += totalCourse;
    }

    return {
      items,
      total,
      page,
      limit,
    };
  }

  async findAll(query: PaginationParams) {
    const { page, limit, search } = query;
    const offset = (page - 1) * limit;
    try {
      const [items, total] = await this.coursesRepository.findAndCount({
        relations: ['courseSets', 'courseSets.udemyQuestionBanks'],
        where: {
          status: 'active',
          name: search ? Like(`%${search}%`) : undefined,
        },
        order: {
          id: 'DESC',
        },
        take: limit,
        skip: offset,
      });
      return {
        items,
        total,
        page,
        limit,
      };
    } catch (error) {
      this.logger.error(`Error getting courses: ${error.message}`);
      throw new BadRequestException('Error getting courses');
    }
  }

  async getCourses(page: number, limit: number) {
    try {
      const offset = (page - 1) * limit;

      const [items, total] = await this.coursesRepository.findAndCount({
        relations: ['courseSets', 'courseSets.udemyQuestionBanks'],
        order: {
          id: 'DESC',
        },
        take: limit,
        skip: offset,
      });

      return {
        items,
        total,
        page,
        limit,
      };
    } catch (error) {
      this.logger.error(`Error getting courses: ${error.message}`);
      throw new BadRequestException('Error getting courses');
    }
  }

  async searchCourses(search: string, page: number, limit: number) {
    try {
      const offset = (page - 1) * limit;

      const [items, total] = await this.coursesRepository.findAndCount({
        where: { name: Like(`%${search}%`) },
        relations: ['courseSets', 'courseSets.udemyQuestionBanks'],
        order: {
          id: 'DESC',
        },
        take: limit,
        skip: offset,
      });

      return {
        items,
        total,
        page,
        limit,
      };
    } catch (error) {
      this.logger.error(`Error searching courses: ${error.message}`);
      throw new BadRequestException('Error searching courses');
    }
  }

  async getCourseById(id: number) {
    try {
      const course = await this.coursesRepository.findOne({
        where: { id },
        relations: ['courseSets', 'courseSets.udemyQuestionBanks'],
      });

      if (!course) {
        throw new BadRequestException('Course not found');
      }

      return course;
    } catch (error) {
      this.logger.error(`Error getting course by id: ${error.message}`);
      throw new BadRequestException('Error getting course by id');
    }
  }

  async findOneWithStatus(id: number) {
    try {
      const course = await this.coursesRepository.findOne({
        where: { id, status: 'active' },
        relations: ['courseSets', 'courseSets.udemyQuestionBanks'],
      });

      if (!course) {
        throw new BadRequestException('Course not found');
      }

      return course;
    } catch (error) {
      this.logger.error(`Error getting course by id: ${error.message}`);
      throw new BadRequestException('Error getting course by id');
    }
  }

  async getGroupCategoryName(): Promise<
    { categoryName: string; count: number }[]
  > {
    try {
      const groupCategoryName = await this.coursesRepository
        .createQueryBuilder('course')
        .select('course.categoryName', 'categoryName')
        .addSelect('COUNT(*)', 'count')
        .groupBy('course.categoryName')
        .getRawMany();

      return groupCategoryName;
    } catch (error) {
      this.logger.error(`Error getting group category name: ${error.message}`);
      throw new BadRequestException('Error getting group category name');
    }
  }

  async updateCourse(id: number, updateCourse: UpdateCourseDto) {
    const {
      categoryName,
      content,
      courseSets: totalSets,
      description,
      name,
      organizationName,
      price,
      status,
      type,
      udemyQuestionBanks: questionsPerSet,
    } = updateCourse;
    const course = await this.getCourseById(id);
    course.name = name;
    course.description = description;
    course.price = price;
    course.status = status;
    course.type = type;
    course.categoryName = categoryName;
    course.organizationName = organizationName;
    course.content = content;

    // Minimum reasonable threshold when there are not enough questions / Ngưỡng tối thiểu hợp lý khi không đủ câu hỏi
    const minQuestionsPerSet = 100;

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();
    try {
      const softDeleteCourseSets = await queryRunner.manager
        .getRepository(CourseSet)
        .createQueryBuilder()
        .delete()
        .where('courseId = :courseId', { courseId: course.id })
        .execute();
      console.log(softDeleteCourseSets);
      const courseSets: CourseSet[] = [];
      for (let i = 0; i < totalSets; i++) {
        const courseSet = new CourseSet();
        courseSet.name = `Course Set ${i + 1}`;
        courseSet.course = course;
        courseSets.push(courseSet);
      }
      const courseSetSaved = await queryRunner.manager
        .createQueryBuilder()
        .insert()
        .into(CourseSet)
        .values(courseSets)
        .execute();
      course.courseSets = courseSetSaved.raw;
      console.log(course);

      await this.distributeQuestions(
        categoryName,
        totalSets,
        minQuestionsPerSet,
        courseSets,
        queryRunner,
        questionsPerSet,
      );
      this.logger.log('Phân phối câu hỏi hoàn tất');

      console.log('course: ', course);

      const saveCourse = await queryRunner.manager
        .getRepository(Course)
        .createQueryBuilder()
        .update(Course)
        .set(course)
        .where('id = :id', { id: course.id })
        .execute();
      // Commit transaction if everything is successful / Commit transaction nếu mọi thứ thành công
      await queryRunner.commitTransaction();

      // Check the final result / Kiểm tra kết quả cuối cùng

      console.log(saveCourse);

      return saveCourse;
    } catch (error) {
      // Rollback if there is an error / Rollback nếu có lỗi
      await queryRunner.rollbackTransaction();
      this.logger.error(`Failed to update course: ${error.message}`);
      throw error;
    } finally {
      // Release queryRunner / Giải phóng queryRunner
      await queryRunner.release();
    }
  }

  async deleteCourse(id: number) {
    try {
      const course = await this.getCourseById(id);
      for (const set of course.courseSets) {
        await this.courseSetsService.remove(set.id);
      }
      return this.coursesRepository.softDelete(id);
    } catch (error) {
      this.logger.error(`Error deleting course: ${error.message}`);
      throw new BadRequestException('Error deleting course');
    }
  }
}
